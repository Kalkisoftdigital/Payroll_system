import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { EmployeesComponent } from './employees/employees.component';
import { DepartmentComponent } from './department/department.component';
import { LeavesComponent } from './leaves/leaves.component';
import { SalaryComponent } from './salary/salary.component';
import { LoginComponent } from './login/login.component';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { CommonModule } from '@angular/common';
import { ChartApexComponent } from './charts/chart-apex/chart-apex.component';
import { ReportCalendarComponent } from './report-calendar/report-calendar.component';
import { NavBarComponent } from './nav-bar/nav-bar.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { TeamReportComponent } from './reports/team-report/team-report.component';
import { LeaveReportComponent } from './reports/leave-report/leave-report.component';
import { PayrollReportComponent } from './reports/payroll-report/payroll-report.component';
import { SecurityReportComponent } from './reports/security-report/security-report.component';
import { WorkFromHomeReportComponent } from './reports/work-from-home-report/work-from-home-report.component';
import { ContactReportComponent } from './reports/contact-report/contact-report.component';

import { FullCalendarModule } from '@fullcalendar/angular';
import { ChatComponent } from './application/chat/chat.component';
import { NotesComponent } from './application/notes/notes.component';
import { CalendarComponent } from './application/calendar/calendar.component';
import { ForgotPasswordComponent } from './profile/forgot-password/forgot-password.component';
import { ResetPasswordComponent } from './profile/reset-password/reset-password.component';
import { LockScreenComponent } from './profile/lock-screen/lock-screen.component';
import { ProfileComponent } from './profile/profile/profile.component';
import { AddDepartmentComponent } from './add-department/add-department.component';
import { HttpClientModule } from '@angular/common/http';
import { AddEmployeeComponent } from './add-employee/add-employee.component';
import { RegisterComponent } from './register/register.component';
import { EmployeesGridComponent } from './employees-grid/employees-grid.component';
import { EmployeeTeamComponent } from './employee-team/employee-team.component';
import { EmployeeDetailsComponent } from './employee-details/employee-details.component';
import { LeaveTypesComponent } from './leave-types/leave-types.component';
import { AddUserComponent } from './add-user/add-user.component';
import { FundMasterComponent } from './fund-master/fund-master.component';
import { PermissionChartComponent } from './permission-chart/permission-chart.component';
import { NgApexchartsModule } from "ng-apexcharts";
import { DocumentComponent } from './document/document.component';
import { ManageRoleComponent } from './manage-role/manage-role.component';
import { UserManagementComponent } from './user-management/user-management.component';
import { AttendanceComponent } from './attendance/attendance.component';
import { AttendanceReportComponent } from './reports/attendance-report/attendance-report.component';
import { CompanyComponent } from './company/company.component';
import { SummaryAttendanceComponent } from './summary-attendance/summary-attendance.component';

@NgModule({
  declarations: [
    AppComponent,
    DashboardComponent,
    EmployeesComponent,
    DepartmentComponent,
    LeavesComponent,
    SalaryComponent,
    LoginComponent,
    ChartApexComponent,
    ReportCalendarComponent,
    NavBarComponent,
    TeamReportComponent,
    LeaveReportComponent,
    PayrollReportComponent,
    SecurityReportComponent,
    WorkFromHomeReportComponent,
    ContactReportComponent,
    ChatComponent,
    NotesComponent,
    CalendarComponent,
    ForgotPasswordComponent,
    ResetPasswordComponent,
    LockScreenComponent,
    ProfileComponent,
    AddDepartmentComponent,
    AddEmployeeComponent,
    RegisterComponent,
    EmployeesGridComponent,
    EmployeeTeamComponent,
    EmployeeDetailsComponent,
    LeaveTypesComponent,
    AddUserComponent,
    FundMasterComponent,
    PermissionChartComponent,
    DocumentComponent,
    ManageRoleComponent,
    UserManagementComponent,
    AttendanceComponent,
    AttendanceReportComponent,
    CompanyComponent,
    SummaryAttendanceComponent,
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    NgbModule,
    CommonModule,
    FormsModule,
    FullCalendarModule,
    HttpClientModule,
    ReactiveFormsModule,
     NgApexchartsModule 
    

  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
