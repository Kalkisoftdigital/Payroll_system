import {
  Component,
  OnInit,
  AfterViewChecked,
  ViewChild,
  ElementRef,
  HostListener,
  ChangeDetectorRef,
} from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ChatService } from 'src/app/Services/Chat-services/chat.service';

interface Employee {
  id: number;
  name: string;
  image?: string;
  lastMessage?: string;
  lastMessageTime?: string;
  isBlocked: boolean;
  unreadCount?: number;
}

interface ChatMessage {
  id: number;
  from: number;
  to: number;
  kind: 'text' | 'image' | 'video' | 'audio';
  content: string;
  mime?: string;
  name?: string;
  timestamp: string;
  sending?: boolean;
  status?: 'sent' | 'delivered' | 'seen';
  read_status?: number;
  text?: string;
    favourite?: boolean;
  unread?: boolean;

}

@Component({
  selector: 'app-chat',
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.scss'],
})
export class ChatComponent implements OnInit, AfterViewChecked {
  employees: Employee[] = [];
  filteredEmployees: Employee[] = [];
  selectedEmployee: Employee | null = null;
  showChatSearch: boolean = false;
  selectedMessageId: number | null = null;
  messages: ChatMessage[] = [];
  newMessage = '';
  replyToMessage: any = null;


  searchTerm = '';
  showDropdown = false;
  showFooterDropdown = false;
  chatSearchTerm = '';

  hoveredUser: number | null = null;

  readonly MAX_BYTES = 10 * 1024 * 1024;
  readonly IMAGE_MAX_W = 1280;
  readonly IMAGE_QUALITY = 0.72;

  isRecording = false;
  mediaRecorder!: MediaRecorder;
  audioChunks: BlobPart[] = [];

  status?: 'sent' | 'delivered' | 'seen';

  backendBaseUrl = 'http://localhost:3000';
  currentUserId: number = 191;

  @ViewChild('chatContainer') chatContainer!: ElementRef;
  @ViewChild('dropdownRoot') dropdownRoot!: ElementRef;
  @ViewChild('cameraInput') cameraInput!: ElementRef<HTMLInputElement>;
  @ViewChild('galleryInput') galleryInput!: ElementRef<HTMLInputElement>;
  @ViewChild('audioInput') audioInput!: ElementRef<HTMLInputElement>;
  imageUrl: string = `http://localhost:3000/assets/img/employees/default.jpg?t=${Date.now()}`;
  imgSrc!: string;


  constructor(private http: HttpClient, private chatService: ChatService, private cdr: ChangeDetectorRef) { }

  ngOnInit(): void {
    this.loadEmployees();
    // Load persisted state
    this.restoreLocal();
    this.imgSrc = 'assets/img/employees/default.jpg?t=' + Date.now();
    this.cdr.detectChanges();
  }

  ngAfterViewChecked(): void {
    this.scrollToBottom();
  }

  // ---------- UI helpers ----------
  scrollToBottom(): void {
    const c = document.getElementById('chat-container');
    if (c) c.scrollTop = c.scrollHeight;
  }

  getEmployeeImage(emp: any): string {
    if (!emp || !emp.image) return 'assets/img/employees/default.jpg';
    return emp.image.startsWith('http')
      ? emp.image
      : `${this.backendBaseUrl}${emp.image}?t=${new Date().getTime()}`;
  }

  filterEmployees(): void {
    const term = this.searchTerm.toLowerCase();
    this.filteredEmployees = this.employees.filter((e) =>
      e.name.toLowerCase().includes(term)
    );
  }
  // Toggle when clicking on 3-dot menu


  updateImage() {
    this.imageUrl = `http://localhost:3000/assets/img/employees/default.jpg?t=${Date.now()}`;
  }


  // ---------- Data load ----------
  loadEmployees(): void {
    this.http.get<any[]>('http://localhost:3000/api/employees').subscribe({
      next: (data) => {
        const saved = this.getSavedEmployeesMap();
        this.employees = data.map((emp) => ({
          ...emp,
          image: emp.image
            ? emp.image.startsWith('http')
              ? emp.image
              : `${this.backendBaseUrl}${emp.image}?t=${new Date().getTime()}`
            : 'assets/img/employees/default.jpg',
          // restore block status if saved in localStorage
          isBlocked: saved.get(emp.id)?.isBlocked ?? false,
          lastMessage: saved.get(emp.id)?.lastMessage ?? '',
          lastMessageTime: saved.get(emp.id)?.lastMessageTime ?? '',
        }));
        this.filteredEmployees = [...this.employees];
      },
      error: (err) => console.error('Failed to load employees', err),
    });
  }

  private getSavedEmployeesMap(): Map<number, Partial<Employee>> {
    const raw = localStorage.getItem('chatEmployees');
    const list: Employee[] = raw ? JSON.parse(raw) : [];
    return new Map(list.map((e) => [e.id, e]));
  }

  // ---------- Select user ----------
  selectEmployee(emp: Employee): void {
    this.selectedEmployee = emp;
    this.loadMessages();

    // mark seen on backend (best-effort)
    this.http
      .post('http://localhost:3000/api/chat/messages/:id/seen', {
        from: emp.id,
        to: this.currentUserId,
      })
      .subscribe({ next: () => { }, error: () => { } });
  }

  // ---------- Messages ----------
  loadMessages(): void {
    if (!this.selectedEmployee) return;

    this.http
      .get<ChatMessage[]>(
        `http://localhost:3000/api/chat/messages?from=${this.currentUserId}&to=${this.selectedEmployee.id}`
      )
      .subscribe({
        next: (data) => {
          this.messages = data
            .map((m) => this.normalizeIncoming(m))
            .sort(
              (a, b) =>
                new Date(a.timestamp).getTime() -
                new Date(b.timestamp).getTime()
            );

          if (this.messages.length) {
            const last = this.messages[this.messages.length - 1];
            this.updateEmployeeLastMessage(last);
          }

          this.markMessagesAsSeen();
          this.persistLocal();
        },
        error: (err) => console.error('Failed to load messages', err),
      });
  }

  private normalizeIncoming(raw: any): ChatMessage {
    let kind: ChatMessage['kind'] = 'text',
      content = '',
      mime,
      name;
    try {
      const parsed =
        typeof raw.content === 'string' ? JSON.parse(raw.content) : raw.content;
      if (parsed?.kind && parsed?.content) {
        kind = parsed.kind;
        content = parsed.content;
        mime = parsed.mime;
        name = parsed.name;
      } else content = String(raw.content ?? '');
    } catch {
      content = String(raw.content ?? '');
    }
    return {
      id: raw.id,
      from: raw.from,
      to: raw.to,
      kind,
      content,
      mime,
      name,
      timestamp: raw.timestamp ?? new Date().toISOString(),
      read_status: raw.read_status ?? 0,
      status: raw.read_status === 2 ? 'seen' : 'delivered',
    };
  }

  markMessagesAsSeen(): void {
    if (!this.selectedEmployee) return;
    const unseen = this.messages.filter(
      (m) => m.from === this.selectedEmployee!.id && m.read_status !== 2
    );
    unseen.forEach((msg) => {
      this.http
        .put(`http://localhost:3000/api/chat/messages/${msg.id}/seen`, {})
        .subscribe({
          next: () => {
            msg.read_status = 2;
            msg.status = 'seen';
            this.persistLocal();
          },
          error: (err) => console.error('Failed to mark as seen:', err),
        });
    });
  }

  sendMessage(): void {
    if (!this.newMessage.trim() || !this.selectedEmployee) return;

    // 🚫 Don’t allow sending if user is blocked
    if (this.selectedEmployee.isBlocked) {
      alert('This user is blocked. Unblock to send messages.');
      return;
    }

    const msg: ChatMessage = {
      id: Date.now(),
      from: this.currentUserId,
      to: this.selectedEmployee.id,
      kind: 'text',
      content: this.newMessage.trim(),
      timestamp: new Date().toISOString(),
      read_status: 0,
      status: 'sent',
    };

    this.pushLocalAndPost(msg);
    this.updateEmployeeLastMessage(msg);
    this.newMessage = '';
  }

  pushLocalAndPost(msg: ChatMessage) {
    this.messages.push(msg);
    this.persistLocal();

    this.http
      .post('http://localhost:3000/api/chat/messages', {
        from: msg.from,
        to: msg.to,
        content:
          msg.kind === 'text'
            ? msg.content
            : JSON.stringify({
              kind: msg.kind,
              content: msg.content,
              mime: msg.mime,
              name: msg.name,
            }),
      })
      .subscribe({
        next: (res: any) => {
          msg.id = res.messageId ?? msg.id;
          msg.timestamp = res.data?.timestamp ?? msg.timestamp;
          msg.read_status = res.data?.read_status ?? msg.read_status;
          this.updateEmployeeLastMessage(msg);
          this.persistLocal();
        },
        error: (err) => {
          console.error('Failed to send message', err);
        },
      });
  }
  get isSelectedEmployeeBlocked(): boolean {
    return this.selectedEmployee?.isBlocked ?? false;
  }

  private updateEmployeeLastMessage(msg: ChatMessage) {
    const targetId = msg.from === this.currentUserId ? msg.to : msg.from;
    const emp = this.employees.find((e) => e.id === targetId);

    if (emp) {
      emp.lastMessage = msg.kind === 'text' ? msg.content : `[${msg.kind}]`;
      emp.lastMessageTime = msg.timestamp;

      // ✅ If incoming message and chat not open, increase unread count
      if (
        msg.from !== this.currentUserId &&
        this.selectedEmployee?.id !== msg.from
      ) {
        emp.unreadCount = (emp.unreadCount || 0) + 1;
      }
    }

    if (this.selectedEmployee && this.selectedEmployee.id === targetId) {
      this.selectedEmployee.lastMessage = emp?.lastMessage || msg.content;
      this.selectedEmployee.lastMessageTime =
        emp?.lastMessageTime || msg.timestamp;
      // ✅ Reset unread count when chat is open
      this.selectedEmployee.unreadCount = 0;
    }

    this.filteredEmployees = [...this.employees];
    this.persistLocal();
  }

  get filteredMessages() {
    return this.messages.filter(
      (msg) =>
        msg.from === this.selectedEmployee?.id ||
        msg.to === this.selectedEmployee?.id
    );
  }



  // ---------- Block / Unblock / Delete / Clear ----------
  blockUser(userId?: number): void {
    if (!userId) return;
    const isSure = confirm('⚠️ Block this user?');
    if (!isSure) return;

    this.http
      .put(`http://localhost:3000/api/employees/${userId}/block`, {})
      .subscribe({
        next: () => {
          const emp = this.employees.find((e) => e.id === userId);
          if (emp) emp.isBlocked = true;
          if (this.selectedEmployee?.id === userId) {
            this.selectedEmployee.isBlocked = true;
          }
          this.persistLocal();
          alert('🚫 User blocked');
        },
        error: (err) => console.error('Block user error:', err),
      });
  }

  unblockUser(userId?: number): void {
    if (!userId) return;
    const isSure = confirm('Unblock this user?');
    if (!isSure) return;

    this.http
      .put(`http://localhost:3000/api/employees/${userId}/unblock`, {})
      .subscribe({
        next: () => {
          const emp = this.employees.find((e) => e.id === userId);
          if (emp) emp.isBlocked = false;
          if (this.selectedEmployee?.id === userId) {
            this.selectedEmployee.isBlocked = false;
          }
          this.persistLocal();
          alert('✅ User unblocked');
        },
        error: (err) => console.error('Unblock user error:', err),
      });
  }

  deleteChat(userId?: number): void {
    if (!userId) return;
    const ok = confirm(
      '⚠️ Delete entire chat with this user? This cannot be undone.'
    );
    if (!ok) return;

    this.http
      .delete(
        `http://localhost:3000/api/chat/conversation/${this.currentUserId}/${userId}`
      )
      .subscribe({
        next: () => {
          this.messages = this.messages.filter(
            (m) =>
              !(
                (m.from === this.currentUserId && m.to === userId) ||
                (m.from === userId && m.to === this.currentUserId)
              )
          );
          const emp = this.employees.find((e) => e.id === userId);
          if (emp) {
            emp.lastMessage = '';
            emp.lastMessageTime = '';
          }
          if (this.selectedEmployee?.id === userId) {
            this.selectedEmployee.lastMessage = '';
            this.selectedEmployee.lastMessageTime = '';
          }
          this.persistLocal();
          alert('✅ Chat deleted');
        },
        error: (err) => {
          console.error(err);
          alert('❌ Failed to delete chat');
        },
      });
  }

  clearMessages(userId?: number): void {
    if (!userId) return;
    const ok = confirm('Clear all messages in this chat?');
    if (!ok) return;

    this.messages = this.messages.filter(
      (m) =>
        !(
          (m.from === this.currentUserId && m.to === userId) ||
          (m.from === userId && m.to === this.currentUserId)
        )
    );
    const emp = this.employees.find((e) => e.id === userId);
    if (emp) {
      emp.lastMessage = '';
      emp.lastMessageTime = '';
    }
    if (this.selectedEmployee?.id === userId) {
      this.selectedEmployee.lastMessage = '';
      this.selectedEmployee.lastMessageTime = '';
    }
    this.persistLocal();
    alert('✅ Messages cleared');
  }

  // ---------- Media pickers (unchanged stubs where needed) ----------
  openCamera(e: Event) {
    e.stopPropagation();
    this.showFooterDropdown = false;
    this.cameraInput?.nativeElement.click();
  }
  openGallery(e: Event) {
    e.stopPropagation();
    this.showFooterDropdown = false;
    this.galleryInput?.nativeElement.click();
  }
  openAudioPicker(e: Event) {
    e.stopPropagation();
    this.showFooterDropdown = false;
    this.audioInput?.nativeElement.click();
  }

  async onPickedMedia(e: Event, source: 'camera' | 'gallery' | 'audio') {
    const input = e.target as HTMLInputElement;
    if (!input.files?.length || !this.selectedEmployee) return;
    const file = input.files[0];
    input.value = '';

    const loadingMsg: ChatMessage = {
      id: Date.now(),
      from: this.currentUserId,
      to: this.selectedEmployee.id,
      kind: 'text',
      content: 'Processing media...',
      timestamp: new Date().toISOString(),
      sending: true,
    };

    try {
      this.messages.push(loadingMsg);
      this.scrollToBottom();

      let prepared;
      if (file.type.startsWith('image/')) {
        prepared = await this.prepareImage(file);
      } else if (file.type.startsWith('video/')) {
        prepared = await this.prepareVideo(file);
      } else if (file.type.startsWith('audio/')) {
        prepared = await this.prepareAudio(file);
      } else {
        throw new Error('Unsupported file type');
      }

      this.messages = this.messages.filter((m) => m.id !== loadingMsg.id);
      const msg: ChatMessage = {
        id: Date.now(),
        from: this.currentUserId,
        to: this.selectedEmployee.id,
        ...prepared,
        timestamp: new Date().toISOString(),
        sending: true,
      };
      this.pushLocalAndPost(msg);
    } catch (err: any) {
      console.error('Media handling failed', err);
      this.messages = this.messages.filter((m) => m.id === loadingMsg.id);
      alert(err?.message || 'Failed to attach media.');
    }
  }

  private async prepareImage(file: File) {
    const compressedImage = await this.compressImage(
      file,
      this.IMAGE_MAX_W,
      this.IMAGE_QUALITY
    );
    this.ensureUnderLimit(compressedImage.size);
    const base64 = await this.fileToBase64(compressedImage);
    return {
      kind: 'image' as const,
      content: base64,
      mime: compressedImage.type || file.type,
      name: file.name,
    };
  }
  private async prepareVideo(file: File) {
    this.ensureUnderLimit(file.size);
    const base64 = await this.fileToBase64(file);
    return { kind: 'video' as const, content: base64, mime: file.type, name: file.name };
  }
  private async prepareAudio(file: File) {
    this.ensureUnderLimit(file.size);
    const base64 = await this.fileToBase64(file);
    return { kind: 'audio' as const, content: base64, mime: file.type, name: file.name };
  }

  private ensureUnderLimit(size: number) {
    if (size > this.MAX_BYTES) throw new Error('Please choose a file under 5 MB.');
  }
  private fileToBase64(file: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64Data = result.includes(',') ? result.split(',')[1] : result;
        resolve(base64Data);
      };
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(file);
    });
  }
  private compressImage(file: File, maxWidth: number, quality: number): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const reader = new FileReader();
      reader.onload = (e) => { img.src = e.target?.result as string; };
      reader.onerror = () => reject(new Error('Failed to read image file'));
      reader.readAsDataURL(file);
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Canvas context not available'));
        let width = img.width;
        let height = img.height;
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => {
          if (!blob) return reject(new Error('Compression failed'));
          resolve(blob);
        }, 'image/jpeg', quality);
      };
      img.onerror = () => reject(new Error('Failed to load image'));
    });
  }
  // ---------- Dropdowns ----------
  toggleDropdown(e: MouseEvent) {
    e.stopPropagation();
    this.showDropdown = !this.showDropdown;
  }
  toggleRecording(event: Event) {
    event.preventDefault();
    console.log('Recording toggled');
    // Your logic for starting/stopping recording
  }
  toggleFooterDropdown(e: Event) {
    e.stopPropagation();
    this.showFooterDropdown = !this.showFooterDropdown;
  }
  closeDropdown(e?: MouseEvent) {
    if (e) e.stopPropagation();
    this.showDropdown = false;
  }
  @HostListener('document:click', ['$event'])
  handleDocumentClick(e: Event) {
    const target = e.target as HTMLElement;
    if (this.dropdownRoot && !this.dropdownRoot.nativeElement.contains(target))
      this.showDropdown = false;
    this.showFooterDropdown = false;
  }

  toggleChatSearch(): void {
    console.log('Search toggled');
    // Example: toggle a boolean to show/hide search input
    this.showChatSearch = !this.showChatSearch;
  }

  // ---------- Local persistence ----------
  private persistLocal() {
    localStorage.setItem('chatMessages', JSON.stringify(this.messages));
    localStorage.setItem('chatEmployees', JSON.stringify(this.employees));
  }

  private restoreLocal() {
    const rawM = localStorage.getItem('chatMessages');
    const rawE = localStorage.getItem('chatEmployees');
    if (rawM) this.messages = JSON.parse(rawM);
    if (rawE) {
      const saved: Employee[] = JSON.parse(rawE);
      // merge any saved block status/last message to current array later in loadEmployees()
      // (already handled in loadEmployees)
    }
  }



  replyMessage(msg: any) {
    console.log("Reply to:", msg.content);
    this.replyToMessage = msg; // store message for preview
    this.selectedMessageId = null;
  }

  forwardMessage(msg: any) {
    console.log("Forward:", msg.content);
    const receiverId = prompt("Enter Employee ID to forward:");
    if (!receiverId) return;

    const newMsg = {
      ...msg,
      id: Date.now(), // temp ID
      receiverId,
      forwarded: true
    };

    this.messages.push(newMsg);
    this.selectedMessageId = null;
  }

  copyMessage(msg: any) {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(msg.content).then(() => {
        alert("✅ Copied!");
      });
    } else {
      console.warn("Clipboard API not supported");
    }
    this.selectedMessageId = null;
  }

 markFavourite(msg: ChatMessage) {
  console.log("⭐ Toggled Favourite:", msg.content);
  this.messages = this.messages.map(m =>
    m.id === msg.id ? { ...m, favourite: !m.favourite } : m
  );
  this.selectedMessageId = null;
}

markUnread(msg: ChatMessage) {
  console.log("📩 Toggled Unread:", msg.content);
  this.messages = this.messages.map(m =>
    m.id === msg.id ? { ...m, unread: !m.unread } : m
  );
  this.selectedMessageId = null;
}



  toggleOptions(msgId: number) {
    this.selectedMessageId =
      this.selectedMessageId === msgId ? null : msgId;
  }

  closeReplyPreview() {
    this.replyToMessage = null;
  }

  ngAfterViewInit() {
    this.imageUrl = this.imageUrl + '?t=' + Date.now();
  }
  deletemessage(id: number) {
    const ok = confirm('⚠️ Delete this message?');
    if (!ok) return;

    this.chatService.deleteMessage(id).subscribe({
      next: (res: any) => {
        console.log("✅ Delete response:", res);
        // 👇 confirm ID matches
        console.log("Before delete:", this.messages);
        this.messages = this.messages.filter(m => m.id !== id);
        console.log("After delete:", this.messages);
        this.selectedMessageId = null;
      },
      error: (err: any) => {
        console.error("❌ Delete error:", err);
      }
    });
  }

}