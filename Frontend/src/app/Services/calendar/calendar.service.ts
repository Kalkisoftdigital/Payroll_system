import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface CalendarEvent {
  id?: number;
  title: string;
  category: string;
  start_date: string;
  end_date: string;
  color?: string;
}

@Injectable({
  providedIn: 'root'
})
export class CalendarService {
  private apiUrl = 'http://localhost:3000/api/calendar'; // ✅ backend port 3000

  constructor(private http: HttpClient) {}

  /** GET all events */
  getEvents(): Observable<CalendarEvent[]> {
    return this.http.get<CalendarEvent[]>(this.apiUrl);
  }

  /** ADD new event */
  addEvent(event: CalendarEvent): Observable<CalendarEvent> {
    if (!event.color) {
      event.color = this.getCategoryColor(event.category);
    }
    return this.http.post<CalendarEvent>(this.apiUrl, event);
  }

  /** DELETE event */
  deleteEvent(id: number | string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  updateEvent(event: CalendarEvent): Observable<CalendarEvent> {
    return this.http.put<CalendarEvent>(`${this.apiUrl}/events/${event.id}`, event);
  }

  /** Utility function: category → color */
private getCategoryColor(category: string): string | undefined {
  switch (category) {
    case 'Holiday': return '#28a745';   // Green
    case 'Meeting': return '#dc3545';   // Red
    case 'Interview': return '#ffc107'; // Yellow
    case 'Training': return '#0d6efd';  // Blue
    case 'Leave': return '#6c757d';     // Gray
  }
  return undefined; // optional, ensures TS is happy
}


}