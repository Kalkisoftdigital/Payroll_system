import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

// Components
import { DashboardComponent } from './dashboard/dashboard.component';
import { EmployeesComponent } from './employees/employees.component';
import { DepartmentComponent } from './department/department.component';
import { LeavesComponent } from './leaves/leaves.component';
import { SalaryComponent } from './salary/salary.component';
import { LoginComponent } from './login/login.component';
import { ChartApexComponent } from './charts/chart-apex/chart-apex.component';
import { ReportCalendarComponent } from './report-calendar/report-calendar.component';
import { NavBarComponent } from './nav-bar/nav-bar.component';
import { TeamReportComponent } from './reports/team-report/team-report.component';
import { LeaveReportComponent } from './reports/leave-report/leave-report.component';
import { PayrollReportComponent } from './reports/payroll-report/payroll-report.component';
import { SecurityReportComponent } from './reports/security-report/security-report.component';
import { WorkFromHomeReportComponent } from './reports/work-from-home-report/work-from-home-report.component';
import { ContactReportComponent } from './reports/contact-report/contact-report.component';
import { CalendarComponent } from './application/calendar/calendar.component';
import { ChatComponent } from './application/chat/chat.component';
import { NotesComponent } from './application/notes/notes.component';
import { ForgotPasswordComponent } from './profile/forgot-password/forgot-password.component';
import { ResetPasswordComponent } from './profile/reset-password/reset-password.component';
import { LockScreenComponent } from './profile/lock-screen/lock-screen.component';
import { ProfileComponent } from './profile/profile/profile.component';
import { AddDepartmentComponent } from './add-department/add-department.component';
import { AddEmployeeComponent } from './add-employee/add-employee.component';
import { RegisterComponent } from './register/register.component';
import { EmployeesGridComponent } from './employees-grid/employees-grid.component';
import { EmployeeTeamComponent } from './employee-team/employee-team.component';
import { EmployeeDetailsComponent } from './employee-details/employee-details.component';
import { LeaveTypesComponent } from './leave-types/leave-types.component';
import { AddUserComponent } from './add-user/add-user.component';
import { FundMasterComponent } from './fund-master/fund-master.component';
import { PermissionChartComponent } from './permission-chart/permission-chart.component';
import { DocumentComponent } from './document/document.component';
import { ManageRoleComponent } from './manage-role/manage-role.component';
import { UserManagementComponent } from './user-management/user-management.component';
import { AttendanceComponent } from './attendance/attendance.component';
import { AttendanceReportComponent } from './reports/attendance-report/attendance-report.component';
import { CompanyComponent } from './company/company.component';

// Guard
import { AuthGuard } from './auth.guard';
import { LoginGuard } from './login.guard';
import { SummaryAttendanceComponent } from './summary-attendance/summary-attendance.component';

const routes: Routes = [
{ path: '', component: LoginComponent, canActivate: [LoginGuard] },
  { path: 'login', component: LoginComponent, canActivate: [LoginGuard] },
  { path: 'register', component: RegisterComponent },
  
  // Protected routes
  { path: 'dashboard', component: DashboardComponent, canActivate: [AuthGuard] },
  { path: 'employees', component: EmployeesComponent, canActivate: [AuthGuard] },
  { path: 'add-employee', component: AddEmployeeComponent, canActivate: [AuthGuard] },
  { path: 'add-employee/:id', component: AddEmployeeComponent, canActivate: [AuthGuard] },
  { path: 'employees-grid', component: EmployeesGridComponent, canActivate: [AuthGuard] },
  { path: 'employee-team', component: EmployeeTeamComponent, canActivate: [AuthGuard] },
  { path: 'employee-details', component: EmployeeDetailsComponent, canActivate: [AuthGuard] },
  { path: 'employee-details/:id', component: EmployeeDetailsComponent, canActivate: [AuthGuard] },
  { path: 'departments', component: DepartmentComponent, canActivate: [AuthGuard] },
  { path: 'add-department', component: AddDepartmentComponent, canActivate: [AuthGuard] },
  { path: 'add-department/:id', component: AddDepartmentComponent, canActivate: [AuthGuard] },
  { path: 'document', component: DocumentComponent, canActivate: [AuthGuard] },
  { path: 'company', component: CompanyComponent, canActivate: [AuthGuard] },
  { path: 'leaves', component: LeavesComponent, canActivate: [AuthGuard] },
  { path: 'leave-types', component: LeaveTypesComponent, canActivate: [AuthGuard] },
  { path: 'attendance', component: AttendanceComponent, canActivate: [AuthGuard] },
    { path: 'summary-attendance', component: SummaryAttendanceComponent, canActivate: [AuthGuard] },

  { path: 'salary', component: SalaryComponent, canActivate: [AuthGuard] },
  { path: 'charts/apex', component: ChartApexComponent, canActivate: [AuthGuard] },
  { path: 'report-calendar', component: ReportCalendarComponent, canActivate: [AuthGuard] },
  { path: 'nav-bar', component: NavBarComponent, canActivate: [AuthGuard] },
  { path: 'fund-master', component: FundMasterComponent, canActivate: [AuthGuard] },
  { path: 'permission-chart', component: PermissionChartComponent, canActivate: [AuthGuard] },

  // Reports
  {
    path: 'reports',
    canActivate: [AuthGuard],
    children: [
      { path: '', redirectTo: 'team-report', pathMatch: 'full' },
      { path: 'team-report', component: TeamReportComponent },
      { path: 'leave-report', component: LeaveReportComponent },
      { path: 'payroll-report', component: PayrollReportComponent },
      { path: 'attendance-report', component: AttendanceReportComponent },
      { path: 'work-from-home-report', component: WorkFromHomeReportComponent },
      { path: 'contact-report', component: ContactReportComponent },
      { path: 'security-report', component: SecurityReportComponent },
    ],
  },

  // Applications
  {
    path: 'application',
    canActivate: [AuthGuard],
    children: [
      { path: '', redirectTo: 'calendar', pathMatch: 'full' },
      { path: 'calendar', component: CalendarComponent },
      { path: 'chat', component: ChatComponent },
      { path: 'notes', component: NotesComponent },
    ],
  },

  // Profile (partially protected)
  {
    path: 'profile',
    children: [
      { path: '', redirectTo: 'forgot-password', pathMatch: 'full' },
      { path: 'forgot-password', component: ForgotPasswordComponent },
      { path: 'reset-password', component: ResetPasswordComponent },
      { path: 'lock-screen', component: LockScreenComponent },
      { path: 'profile', component: ProfileComponent, canActivate: [AuthGuard] },
    ],
  },

  // Manage Roles & Users
  { path: 'roles', component: ManageRoleComponent, canActivate: [AuthGuard] },
  { path: 'roles/:roleId/users', component: UserManagementComponent, canActivate: [AuthGuard] },
  { path: 'users', component: UserManagementComponent, canActivate: [AuthGuard] },
  { path: 'users/add', component: UserManagementComponent, canActivate: [AuthGuard] },
  { path: 'users/edit/:id', component: UserManagementComponent, canActivate: [AuthGuard] },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
