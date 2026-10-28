/* Calendar arithmetic uses local calendar dates, never 24-hour jumps across DST. */
(function(root){
  function parseAppointment(text, previous={}, instant=new Date()) {
    const t=String(text||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
    const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Rome',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(instant);
    const o=Object.fromEntries(parts.map(p=>[p.type,p.value]));
    const today=new Date(Date.UTC(+o.year,+o.month-1,+o.day));
    const iso=d=>d.toISOString().slice(0,10);
    const add=n=>new Date(today.getTime()+n*86400000);
    let day=previous.day||null,time=previous.time||null,period=previous.period||null,error=null,explicitDay=false;
    const setDate=(y,m,d)=>{const x=new Date(Date.UTC(y,m-1,d));if(x.getUTCFullYear()!==y||x.getUTCMonth()!==m-1||x.getUTCDate()!==d){error='invalid_date';return;}day=iso(x);explicitDay=true;};
    const absolute=t.match(/\b(20\d{2})-(\d{2})-(\d{2})\b/);
    const slash=t.match(/\b(\d{1,2})[\/.](\d{1,2})(?:[\/.](20\d{2}))?\b/);
    if(absolute)setDate(+absolute[1],+absolute[2],+absolute[3]);
    else if(slash)setDate(+(slash[3]||o.year),+slash[2],+slash[1]);
    else if(/\b(dopodomani|day after tomorrow|pasado manana)\b/.test(t)){day=iso(add(2));explicitDay=true;}
    else if(/\b(domani|tomorrow)\b/.test(t)||(/\bmanana\b/.test(t)&&!t.includes('por la manana'))){day=iso(add(1));explicitDay=true;}
    else if(/\b(oggi|today|hoy)\b/.test(t)){day=iso(today);explicitDay=true;}
    else {
      const week=[['domenica','sunday','domingo'],['lunedi','monday','lunes'],['martedi','tuesday','martes'],['mercoledi','wednesday','miercoles'],['giovedi','thursday','jueves'],['venerdi','friday','viernes'],['sabato','saturday','sabado']];
      const target=week.findIndex(names=>names.some(n=>new RegExp('\\b'+n+'\\b').test(t)));
      if(target>=0){let offset=(target-today.getUTCDay()+7)%7;if(!offset)offset=7;
        if(/settimana prossima|prossima settimana|next week|semana que viene|proxima semana/.test(t))offset=(8-(today.getUTCDay()||7))+(target+6)%7;
        day=iso(add(offset));explicitDay=true;
      } else if(/\b\d{1,2}\s+(gennaio|febbraio|marzo|aprile|maggio|giugno|luglio|agosto|settembre|ottobre|novembre|dicembre|january|february|march|april|may|june|july|august|september|october|november|december|enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\b/.test(t)) {
        const months=[['gennaio','january','enero'],['febbraio','february','febrero'],['marzo','march'],['aprile','april','abril'],['maggio','may','mayo'],['giugno','june','junio'],['luglio','july','julio'],['agosto','august'],['settembre','september','septiembre'],['ottobre','october','octubre'],['novembre','november','noviembre'],['dicembre','december','diciembre']];
        for(let m=0;m<months.length;m++){const hit=t.match(new RegExp('\\b(\\d{1,2})\\s+(?:'+months[m].join('|')+')(?:\\s+(20\\d{2}))?\\b'));if(hit){setDate(+(hit[2]||o.year),m+1,+hit[1]);break;}}
      }
    }
    if(explicitDay&&!/\b(stessa ora|same time|misma hora)\b/.test(t)){time=null;period=null;}
    if(/\b(mattina|morning|por la manana)\b/.test(t))period='morning';
    if(/\b(pomeriggio|afternoon|tarde)\b/.test(t))period='afternoon';
    const hour=t.match(/(?:\balle\s*|\bore\s*|\bat\s+|\ba las\s+)(\d{1,2})(?:[:.](\d{2}))?(?:\s*(am|pm))?\b/)||t.match(/\b(\d{1,2}):(\d{2})(?:\s*(am|pm))?\b/)||t.match(/\b(\d{1,2})\s*(am|pm)\b/);
    if(hour){let h=+hour[1],m=Number(/^\d+$/.test(hour[2]||'')?hour[2]:0),meridiem=hour[3]||(/am|pm/.test(hour[2]||'')?hour[2]:null);
      if((meridiem&&(h<1||h>12))||h>23||m>59)error='invalid_time';
      else {if(meridiem)h=h%12+(meridiem==='pm'?12:0);else if(h<12&&period==='afternoon')h+=12;
        if(!meridiem&&h>0&&h<8&&!period)error='ambiguous_time';
        else time=String(h).padStart(2,'0')+':'+String(m).padStart(2,'0');}
    }
    if(day&&day<iso(today))error='past_date';
    return {day,time,period,error,explicitDay};
  }
  function fromHistory(turns,instant=new Date()){
    let context={phase:'ready'};
    for(const turn of turns||[]){
      if(turn.role!=='user')continue;
      const text=String(turn.text||'');const fresh=parseAppointment(text,{},instant);
      const information=/\b(come|how|what|cosa|spiega|explain|studio|study|perche|why|regola|rule|esame|exam)\b/i.test(text);
      if(/\b(annull\w*|disdic\w*|cancel\w*)\b|non (?:voglio|devi) (?:piu |più )?prenot|don.t book|do not book/i.test(text)){context={phase:'cancelled'};continue;}
      const badge=/badge/i.test(text)&&/ritir|slot|orar|data/i.test(text);
      const continuation=/^(?:ok|okay|quindi|si|sì|va bene|allora)\b|\b(?:ritiro|orari|orario|quando|disponibil|scegli|scelgo)\b/i.test(text);
      const booking=/\b(prenot\w*|appuntament\w*|appointment|book\w*|cita|reserva\w*|slot)\b/i.test(text);
      if(badge||(booking&&!information)||(context.phase==='awaiting_slot'&&((!information&&(fresh.explicitDay||fresh.time||fresh.period||fresh.error==='ambiguous_time'))||(continuation&&!information))))context={...parseAppointment(text,context,instant),phase:'awaiting_slot'};
      else if(!/^\s*(si|sì|yes|ok|va bene|vale)[.!\s]*$/i.test(text))context={phase:'ready'};
    }
    return context;
  }
  root.CaseyDates=Object.freeze({parseAppointment,fromHistory});
})(typeof window!=='undefined'?window:globalThis);
