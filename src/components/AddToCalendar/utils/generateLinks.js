import { saveAs } from 'file-saver';
import { createEvent} from 'ics';

const isMobile = async () => true;

export const downloadICS = async (event) => {
    console.log('downloadICS', event)
    const file = await new Promise((resolve, reject) => {
        createEvent( event , (error, value) => {
            if (error) {
                reject(error)
            }
            const blob = new Blob([value], { type: 'text/calendar' });
            saveAs(blob, `${event.title}.ics`);
        });
    });
}

export const generateGoogleLink  = async (event) => {

    let calLink = [];

    if (isMobile()) {
        calLink.push('https://calendar.google.com/calendar/render?action=TEMPLATE&');
    } else {
        calLink.push('https://calendar.google.com/calendar/r/eventedit?');
    }

    if (event.timeZone && event.timeZone !== '' && !/GMT[+|-]\d{1,2}|Etc\/U|Etc\/Zulu|CET|CST6CDT|EET|EST|MET|MST|PST8PDT|WET|PST|PDT|MDT|CST|CDT|EDT|EEST|CEST|HST|HDT|AKST|AKDT|AST|ADT|AEST|AEDT|NZST|NZDT|IST|IDT|WEST|ACST|ACDT|BST/i.test(date.timeZone) && !formattedDate.allday) {
        calLink.push('ctz=' + date.timeZone);
    }

    calLink.push(`dates=${encodeURIComponent(event.start+'00')}%2F${encodeURIComponent(event.end+'00')}`);

    if (event.location && event.location !== '') {
        calLink.push(`location=${ encodeURIComponent(event.location)}`);
    }

    if (event.title && event.title !== '') {
        calLink.push(`text=${ encodeURIComponent(event.title)}`);
    }

    if (event.description && event.description.length > 0) {
        const d = `${event.description}' &#128205;:${event.location}`;
        calLink.push(`details=${encodeURIComponent(d)}`);
    }

    return calLink.join('&');
}
