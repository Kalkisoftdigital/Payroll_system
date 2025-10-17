import { Component, OnInit, Renderer2 } from '@angular/core';
import { CalendarOptions, EventInput } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import bootstrap5Plugin from '@fullcalendar/bootstrap5';
import { CalendarEvent, CalendarService } from 'src/app/Services/calendar/calendar.service';
import { AuthService } from 'src/app/Services/Auth-services/auth.service';

declare var bootstrap: any;

@Component({
  selector: 'app-calendar',
  templateUrl: './calendar.component.html',
  styleUrls: ['./calendar.component.scss']
})
export class CalendarComponent implements OnInit {

  currentModalColor?: string;
  eventsList: CalendarEvent[] = [];
  selectedDate: string | null = null;

  userRole: string = '';
  isEditable: boolean = false;

  addEventModel: Partial<CalendarEvent> = {
    title: '',
    category: 'Meeting',
    start_date: '',
    end_date: ''
  };

 calendarOptions: CalendarOptions = {
  plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin, bootstrap5Plugin],
  initialView: 'dayGridMonth',
  headerToolbar: {
    left: 'prev,next today',
    center: 'title',
    right: 'dayGridMonth,timeGridWeek,timeGridDay'
  },
  themeSystem: 'bootstrap5',

  // Editable & selectable will be set dynamically in ngOnInit based on role
  editable: false,
  selectable: false,

  displayEventTime: false,
  events: [] as EventInput[],

  // Only allow add/edit if user has permission
  dateClick: (info) => this.isEditable ? this.openAddEventModal(info.dateStr) : null,
  eventClick: (info) => this.isEditable ? this.handleEventClick(info) : null,

  eventMouseEnter: (info) => this.handleEventMouseEnter(info),
  eventMouseLeave: (info) => this.handleEventMouseLeave(info),

  eventDidMount: (info) => {
    // Color based on category
    const color = info.event.extendedProps['category'] 
                  ? this.getCategoryColor(info.event.extendedProps['category']) 
                  : '#0d6efd';
    info.el.style.backgroundColor = color;
    info.el.style.borderColor = color;
    info.el.style.color = '#fff';
  }
};


  private currentTooltip?: HTMLElement;

  constructor(private calendarService: CalendarService, 
              private renderer: Renderer2,
              private authService: AuthService) { }

ngOnInit(): void {
  const user = this.authService.getUser();
  this.userRole = user?.roleName || '';
  this.isEditable = this.authService.canEditCalendar(); // ✅ should be true now

  this.calendarOptions = {
    ...this.calendarOptions,
    editable: this.isEditable,
    selectable: this.isEditable
  };

  this.loadAllEvents();
}




  loadAllEvents() {
    this.calendarService.getEvents().subscribe(events => {
      this.eventsList = events.map(ev => ({
        ...ev,
        color: ev.color && ev.color !== '' ? ev.color : this.getCategoryColor(ev.category)
      }));

      const currentYear = new Date().getFullYear();
       const COMMON_HOLIDAYS: CalendarEvent[] = [
  { title: 'New Year', category: 'Holiday', start_date: `${currentYear}-01-01`, end_date: `${currentYear}-01-01` },
  { title: 'Republic Day', category: 'Holiday', start_date: `${currentYear}-01-26`, end_date: `${currentYear}-01-26` },
  { title: 'Chhatrapati Shivaji Maharaj Jayanti', category: 'Holiday', start_date: `${currentYear}-02-19`, end_date: `${currentYear}-02-19` },
  { title: 'Maha Shivratri', category: 'Holiday', start_date: `${currentYear}-02-26`, end_date: `${currentYear}-02-26` },
  { title: 'Holi (Second Day)', category: 'Holiday', start_date: `${currentYear}-03-14`, end_date: `${currentYear}-03-14` },
  { title: 'Gudi Padwa', category: 'Holiday', start_date: `${currentYear}-03-30`, end_date: `${currentYear}-03-30` },
  { title: 'Ramzan/Eid-ul-Fitr', category: 'Holiday', start_date: `${currentYear}-03-31`, end_date: `${currentYear}-03-31` },
  { title: 'Ram Navami', category: 'Holiday', start_date: `${currentYear}-04-06`, end_date: `${currentYear}-04-06` },
  { title: 'Mahavir Jayanti', category: 'Holiday', start_date: `${currentYear}-04-10`, end_date: `${currentYear}-04-10` },
  { title: 'Good Friday', category: 'Holiday', start_date: `${currentYear}-04-18`, end_date: `${currentYear}-04-18` },
  { title: 'Maharashtra Day', category: 'Holiday', start_date: `${currentYear}-05-01`, end_date: `${currentYear}-05-01` },
  { title: 'Buddha Purnima', category: 'Holiday', start_date: `${currentYear}-05-12`, end_date: `${currentYear}-05-12` },
  { title: 'Bakri Eid / Eid-ul-Adha', category: 'Holiday', start_date: `${currentYear}-06-07`, end_date: `${currentYear}-06-07` },
  { title: 'Muharram', category: 'Holiday', start_date: `${currentYear}-07-06`, end_date: `${currentYear}-07-06` },
  { title: 'Independence Day', category: 'Holiday', start_date: `${currentYear}-08-15`, end_date: `${currentYear}-08-15` },
  { title: 'Ganesh Chaturthi', category: 'Holiday', start_date: `${currentYear}-08-27`, end_date: `${currentYear}-08-27` },
  { title: 'Id-e-Milad', category: 'Holiday', start_date: `${currentYear}-09-05`, end_date: `${currentYear}-09-05` },
  { title: 'Dussehra / Vijayadashami', category: 'Holiday', start_date: `${currentYear}-10-02`, end_date: `${currentYear}-10-02` },
  { title: 'Diwali (Lakshmi Puja)', category: 'Holiday', start_date: `${currentYear}-10-21`, end_date: `${currentYear}-10-21` },
  { title: 'Christmas', category: 'Holiday', start_date: `${currentYear}-12-25`, end_date: `${currentYear}-12-25` }
];

      this.eventsList = [...COMMON_HOLIDAYS, ...this.eventsList];
      this.calendarOptions.events = this.mapToCalendarEvents(this.eventsList);
    });
  }

  openAddEventModal(dateStr?: string) {
    this.selectedDate = dateStr || null;
    if (dateStr) {
      this.addEventModel.start_date = dateStr;
      this.addEventModel.end_date = dateStr;
    } else {
      this.addEventModel = { title: '', category: 'Meeting', start_date: '', end_date: '' };
    }
    const modalElement = document.getElementById('add_event');
    if (modalElement) new bootstrap.Modal(modalElement).show();
  }

  onSubmitAddEvent() {
    if (!this.addEventModel.title || !this.addEventModel.start_date) return;

    const payload: CalendarEvent = {
      title: this.addEventModel.title!,
      category: this.addEventModel.category!,
      start_date: this.addEventModel.start_date!,
      end_date: this.addEventModel.end_date || this.addEventModel.start_date,
      color: this.currentModalColor || this.getCategoryColor(this.addEventModel.category!)
    };

    this.calendarService.addEvent(payload).subscribe({
      next: saved => {
        this.eventsList.push({ ...saved, color: saved.color || this.getCategoryColor(saved.category) });
        this.calendarOptions.events = this.mapToCalendarEvents(this.eventsList);

        const modalEl = document.getElementById('add_event');
        if (modalEl) bootstrap.Modal.getInstance(modalEl)?.hide();
      },
      error: err => console.error('Error saving event:', err)
    });
  }

  private mapToCalendarEvents(events: CalendarEvent[]): EventInput[] {
    return events.map(ev => ({
      id: ev.id?.toString(),
      title: ev.title,
      start: ev.start_date,
      end: ev.end_date,
      extendedProps: { category: ev.category }
    }));
  }

  private getCategoryColor(category: string): string {
    switch (category) {
      case 'Holiday':   return '#28a745';
      case 'Meeting':   return '#dc3545';
      case 'Interview': return '#ffc107';
      case 'Training':  return '#0d6efd';
      case 'Leave':     return '#6c757d';
      default:          return '#0d6efd';
    }
  }

  onCategoryChange(newCategory: string) {
    this.addEventModel.category = newCategory;
    this.currentModalColor = this.getCategoryColor(newCategory);
  }



  filterEventsByCategory(category: string) {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();

    const filtered = this.eventsList.filter(ev => {
      if (!ev.start_date) return false;
      const eventDate = new Date(ev.start_date);
      return ev.category === category &&
             eventDate.getFullYear() === year &&
             eventDate.getMonth() === month;
    });

    if (!filtered.length) {
      alert(`No ${category} scheduled this month`);
      return;
    }

    this.calendarOptions = {
      ...this.calendarOptions,
      events: this.mapToCalendarEvents(filtered)
    };
  }

  handleEventMouseEnter(info: any) {
    if (this.currentTooltip) { this.currentTooltip.remove(); this.currentTooltip = undefined; }

    const tooltip = this.renderer.createElement('div');
    tooltip.classList.add('fc-tooltip');
    const start = info.event.start;
    const end = info.event.end;
    tooltip.innerHTML = `<strong>${this.escapeHtml(info.event.title)}</strong>
                         <div class="small">${start ? this.formatDate(start) : ''}${end ? ` — ${this.formatDate(end)}` : ''}</div>`;
    this.renderer.appendChild(document.body, tooltip);

    this.renderer.setStyle(tooltip, 'position', 'absolute');
    this.renderer.setStyle(tooltip, 'top', `${info.jsEvent.pageY + 12}px`);
    this.renderer.setStyle(tooltip, 'left', `${info.jsEvent.pageX + 12}px`);
    this.renderer.setStyle(tooltip, 'z-index', '2000');
    this.renderer.setStyle(tooltip, 'pointer-events', 'none');

    this.currentTooltip = tooltip;
  }

  handleEventMouseLeave(info: any) {
    if (this.currentTooltip) { this.currentTooltip.remove(); this.currentTooltip = undefined; }
  }

  handleEventClick(info: any) {
    if (!this.isEditable) return;

    const evId = info.event.id;
    const title = info.event.title;
    if (!evId) return;

    if (confirm(`Delete event "${title}"?`)) {
      this.calendarService.deleteEvent(evId).subscribe({
        next: () => {
          info.event.remove();
          this.eventsList = this.eventsList.filter(e => e.id?.toString() !== evId.toString());
        },
        error: err => console.error(err)
      });
    }
  }

  private formatDate(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  private escapeHtml(s: string) {
    if (!s) return '';
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

}