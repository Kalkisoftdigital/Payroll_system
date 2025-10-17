import { Component, Renderer2, OnInit } from '@angular/core';
import { AuthService } from '../Services/Auth-services/auth.service';
import { CompanyService, Company } from '../Services/company_service/company.service';

@Component({
  selector: 'app-nav-bar',
  templateUrl: './nav-bar.component.html',
  styleUrls: ['./nav-bar.component.scss']
})
export class NavBarComponent implements OnInit {

  isDarkMode = false;
  userRole: string = '';
  userPermissions: any = {};
  user: any;
  applicationsOpen = false;
  salaryOpen = false;
  isCollapsed = false;
  company: Company | null = null; // To store company info including logo
  canReportAction: boolean = false;

  constructor(
    private renderer: Renderer2,
    public authService: AuthService,
    private companyService: CompanyService
  ) { }

ngOnInit() {
  this.authService.currentUser$.subscribe(user => {
    this.user = user;
    this.userRole = user?.roleName || user?.role || '';
  });

  this.authService.permissions$.subscribe(perm => {
    this.userPermissions = perm;
    this.canReportAction = perm?.can_report_action === 1 || this.authService.isSuperAdmin();
  });

  // 🔹 Listen for live permission updates from PermissionChart
  this.authService.permissionsUpdated$.subscribe(() => {
    const perm = this.authService.getPermissions();
    this.canReportAction = perm?.can_report_action === 1 || this.authService.isSuperAdmin();
  });

  this.loadCompany();
}

  onAccessToggle(event: any) {
    if (!this.user) return;

    // checkbox check/uncheck update
    if (event.target.checked) {
      this.user.can_access_salary = 1;
      this.user.can_access_leaves = 1;
    } else {
      this.user.can_access_salary = 0;
      this.user.can_access_leaves = 0;
    }



    // Update AuthService (reactive)
    this.authService.setUser(this.user);
  }

  toggleFullscreen(): void {
    const doc: any = document;
    if (!doc.fullscreenElement) {
      const docEl: any = document.documentElement;
      if (docEl.requestFullscreen) docEl.requestFullscreen();
      else if (docEl.mozRequestFullScreen) docEl.mozRequestFullScreen();
      else if (docEl.webkitRequestFullscreen) docEl.webkitRequestFullscreen();
      else if (docEl.msRequestFullscreen) docEl.msRequestFullscreen();
    } else {
      if (doc.exitFullscreen) doc.exitFullscreen();
      else if (doc.webkitExitFullscreen) doc.webkitExitFullscreen();
      else if (doc.mozCancelFullScreen) doc.mozCancelFullScreen();
      else if (doc.msExitFullscreen) doc.msExitFullscreen();
    }
  }

  toggleTheme(): void {
    this.isDarkMode = !this.isDarkMode;
    this.setTheme(this.isDarkMode);
    localStorage.setItem('theme', this.isDarkMode ? 'dark' : 'light');
  }

  toggleApplications(): void {
    this.applicationsOpen = !this.applicationsOpen;
  }

  toggleSalary() {
    this.salaryOpen = !this.salaryOpen;
  }

  get canViewDepartment(): boolean {
    return this.authService.canDepartmentAction();
  }

get canViewReports(): boolean {
  if (this.authService.isSuperAdmin()) return true;
  return this.authService.hasPermission('can_report_action');
}


  private setTheme(isDark: boolean): void {
    document.documentElement.setAttribute('data-bs-theme', isDark ? 'dark' : 'light');
    console.log('Theme set to:', isDark ? 'dark' : 'light');
  }

  toggleSidebar() {
    this.isCollapsed = !this.isCollapsed;
    const sidebar = document.getElementById('sidebar');
    if (sidebar) sidebar.classList.toggle('collapsed', this.isCollapsed);
  }

  loadCompany() {
    this.companyService.getCompany().subscribe({
      next: (res: Company) => {
        this.company = res;
        console.log('Company info loaded:', res);
      },
      error: (err) => console.error('Error fetching company info:', err)
    });
  }

  logout() {
    this.authService.logout();
  }
}
