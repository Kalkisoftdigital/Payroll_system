import { Component, OnInit } from '@angular/core';
import { AuthService } from './Services/Auth-services/auth.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  title = 'Frontend';

  constructor(private auth: AuthService) {}

ngOnInit(): void {
  const storedUser = sessionStorage.getItem('user'); // 🔹 changed
  if (storedUser) {
    const user = JSON.parse(storedUser);
    if (user.token && !this.auth.isTokenExpired()) {
      this.auth.restoreUser(user);
    } else {
      this.auth.logout();
    }
  }

  const storedPerm = sessionStorage.getItem('userPermissions'); // 🔹 changed
  if (storedPerm) this.auth.restorePermissions(JSON.parse(storedPerm));
}
}
