import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

interface Employee { id: number; name: string; }
interface Message { from: number; to: number; content: string; timestamp: Date; }

@Injectable({ providedIn: 'root' })
export class ChatService {
  backendUrl = 'http://localhost:3000/api';

  constructor(private http: HttpClient) {}

  getEmployees(): Observable<Employee[]> {
    return this.http.get<Employee[]>(`${this.backendUrl}/employees`);
  }

  getMessagesBetween(userId1: number, userId2: number): Observable<Message[]> {
    return this.http.get<Message[]>(`${this.backendUrl}/chat/messages?from=${userId1}&to=${userId2}`);
  }

  sendMessage(message: Message): Observable<any> {
    return this.http.post(`${this.backendUrl}/chat/messages`, message);
  }

 deleteMessage(id: number) {
  return this.http.delete<{ success: boolean; message: string }>(
    `http://localhost:3000/api/chat/messages/${id}`
  );
}


}