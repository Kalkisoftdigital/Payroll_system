import { Component, OnInit } from '@angular/core';
import { EmployeesService, Employee } from '../Services/Employees-serives/employees.service';
import { TeamService } from '../Services/Team-services/team.service';
import * as bootstrap from 'bootstrap';

interface Team {
  id?: number;
  team: string;       // display name
  name: string;       // backend name
  status: string;
  members: Employee[];
  selectedTeam?: Team;

}

@Component({
  selector: 'app-employee-team',
  templateUrl: './employee-team.component.html',
  styleUrls: ['./employee-team.component.scss']
})
export class EmployeeTeamComponent implements OnInit {
  selectedEmployeeId: number | null = null;
  employees: Employee[] = [];
  teams: Team[] = [];
  newTeamName: string = '';
  filteredTeams: Team[] = [];
  searchTerm: string = '';
  allEmployees: Employee[] = []; // master copy
  selectedEmployeeIdForDelete?: number;
  loading = false;
  selectedSort: string = 'Newest';
  sortDropdownOpen: boolean = false;
  customTeamName: string = '';
  selectedTeam?: Team;
  availableTeams: Team[] = []; // Add Team dropdown
  statusFilter: string[] = []; // Active / Inactive
  selectedEmployeeIds: number[] = [];



  backendBaseUrl = 'http://localhost:3000';

  constructor(
    private employeesService: EmployeesService,
    private teamservice: TeamService
  ) { }

  ngOnInit(): void {
    this.loadEmployees();
    this.loadTeams();
    this.loadAvailableTeams();
  }

  loadAvailableTeams(): void {
    this.teamservice.getTeams().subscribe({
      next: (data: any[]) => {
        this.availableTeams = data.map(t => ({
          id: t.id,
          team: t.name,
          name: t.name,
          status: t.status,
          members: t.members ?? []
        }));
      },
      error: err => console.error('Failed to load available teams:', err)
    });
  }

  loadEmployees(): void {
    this.employeesService.getEmployees().subscribe({
      next: (data: Employee[]) => {
        this.employees = data.map(emp => ({
          ...emp,
          image: emp.image
            ? emp.image.startsWith('http')
              ? emp.image
              : `${this.backendBaseUrl}${emp.image}?t=${new Date().getTime()}`
            : 'assets/default-avatar.png'
        }));
        this.allEmployees = [...this.employees];
        this.buildTeams();
      },
      error: err => console.error('Failed to load employees:', err)
    });
  }

  buildTeams(): void {
    const teamMap: { [key: string]: Employee[] } = {};
    this.employees.forEach(emp => {
      const teamName = emp.team || 'No Team';
      if (!teamMap[teamName]) teamMap[teamName] = [];
      teamMap[teamName].push(emp);
    });

    this.teams = Object.keys(teamMap).map((teamName, index) => ({
      id: index + 1,
      team: teamName,
      name: teamName,
      status: '',
      members: teamMap[teamName]
    }));
    this.filteredTeams = [...this.teams];
  }

  getEmployeeImage(emp: Employee): string {
    return emp.image ?? 'assets/default-avatar.png';
  }

  onStatusChange(team: Team): void {
    if (!team.id) return;
    this.teamservice.updateTeamStatus(team.id, team.status).subscribe({
      next: () => console.log(`Status updated: ${team.status}`),
      error: err => alert('Status update failed: ' + err.message)
    });
  }

  addTeam(): void {
    let teamNameToUse = this.newTeamName;

    // Handle "Create New Team"
    if (this.newTeamName === '__new') {
      if (!this.customTeamName.trim()) {
        alert('Please enter a team name');
        return;
      }
      teamNameToUse = this.customTeamName.trim();
    }

    if (!teamNameToUse) {
      alert('Team name is required');
      return;
    }

    const empId = Number(this.selectedEmployeeId);
    const selectedEmployee = this.employees.find(emp => emp.id === empId);

    if (!selectedEmployee) {
      alert('Please select an employee');
      return;
    }

    console.log('Adding team:', { employeeId: selectedEmployee.id, teamName: teamNameToUse });

    // ✅ Call backend via TeamService
    this.teamservice.updateEmployeeTeam(selectedEmployee.id!, teamNameToUse).subscribe({
      next: (res) => {
        console.log('Team added successfully:', res);
        // Update frontend arrays
        selectedEmployee.team = teamNameToUse;

        const existingTeam = this.teams.find(t => t.name === teamNameToUse);
        if (!existingTeam) {
          this.teams.push({
            id: this.teams.length + 1,
            team: teamNameToUse,
            name: teamNameToUse,
            status: 'Active',
            members: [selectedEmployee]
          });
        } else {
          existingTeam.members.push(selectedEmployee);
        }

        this.filteredTeams = [...this.teams];
        // Reset form
        this.newTeamName = '';
        this.customTeamName = '';
        this.selectedEmployeeId = null;
        alert(`Employee ${selectedEmployee.firstname} added to team "${teamNameToUse}" successfully!`);
      },
      error: (err) => {
        console.error('Failed to add team:', err);
        alert('Failed to add team: ' + (err.error?.error || err.message));
      }
    });
  }

  editTeam(team: Team): void {
    this.selectedTeam = { ...team, members: team.members.map(m => ({ ...m })) };
    const modalEl = document.getElementById('edit_modal');
    if (modalEl) new bootstrap.Modal(modalEl).show();
  }

saveEditTeam(): void {
  if (!this.selectedTeam) return;

  console.log('Saving edited team:', this.selectedTeam);

  // Check for duplicate team name
  const duplicate = this.teams.find(
    t => t.name === this.selectedTeam!.team && t.id !== this.selectedTeam!.id
  );
  if (duplicate) {
    alert('This team name already exists!');
    return;
  }

  // Prepare payload for backend
const payload = {
  name: this.selectedTeam.team,
  status: this.selectedTeam.status,
  members: this.selectedTeam.members.map(m => m.id)
};

  console.log('Payload sent to backend:', payload);

  // Call backend
  this.teamservice.updateTeam(this.selectedTeam.id!, payload).subscribe({
    next: () => {
      console.log('Team updated successfully!');

      // Update frontend
      const index = this.teams.findIndex(t => t.id === this.selectedTeam!.id);
      if (index !== -1) {
        this.teams[index] = { ...this.selectedTeam! };
        this.filteredTeams = [...this.teams];
      }

      // Close modal
      const modalEl = document.getElementById('edit_modal');
      if (modalEl) bootstrap.Modal.getInstance(modalEl)?.hide();

      this.selectedTeam = undefined;
      alert('Team updated successfully!');
    },
    error: err => {
      console.error('Failed to update team:', err);
      alert('Failed to update team: ' + (err.error?.message || err.message));
    }
  });
}

  deleteTeam(team: Team): void {
    if (!team.id) return;
    if (!confirm(`Delete team "${team.team}"?`)) return;

    this.teamservice.deleteTeam(team.id).subscribe({
      next: () => {
        this.teams = this.teams.filter(t => t.id !== team.id);
        this.filteredTeams = [...this.teams];
        alert('Team deleted successfully!');
      },
      error: err => alert('Failed to delete team')
    });
  }

onEmployeeCheckboxChange(event: any, emp: any) {
  const empId = emp.id ?? 0;

  if (event.target.checked) {
    // add if not already present
    if (!this.selectedEmployeeIds.includes(empId)) {
      this.selectedEmployeeIds.push(empId);
    }
  } else {
    // remove if unchecked
    this.selectedEmployeeIds = this.selectedEmployeeIds.filter(id => id !== empId);
  }
}

addMembersToTeam() {
  if (!this.selectedTeam || this.selectedEmployeeIds.length === 0) {
    console.warn('No team selected or no employees selected');
    return;
  }

  this.selectedEmployeeIds.forEach(empId => {
    const emp = this.employees.find(e => e.id === empId);

    if (emp && !this.selectedTeam?.members?.some(m => m.id === emp.id)) {
      this.selectedTeam!.members!.push(emp);   // `!` compiler la sangtay ki guaranteed defined aahe
      console.log(`Added employee ${emp.firstname} ${emp.lastName} to team`);
    }
  });

  // ✅ clear selection after adding
  this.selectedEmployeeIds = [];
}
removeMemberFromTeam(emp: Employee) {
  if (!this.selectedTeam) {
    console.warn('No selected team to remove member from.');
    return;
  }

  console.log('Removing member from team:', emp);
  this.selectedTeam.members = this.selectedTeam.members.filter(m => m.id !== emp.id);
  console.log('Selected team after removal:', this.selectedTeam);
}

  loadTeams(): void {
    this.teamservice.getTeams().subscribe({
      next: (data: any[]) => {
        this.teams = data.map(t => ({
          id: t.id,
          team: t.name,
          name: t.name,
          status: t.status,
          members: (t.members || []).map((m: any) => ({
            id: m.id, firstname: m.firstname, lastName: m.lastName,
            image: m.image ? `${this.backendBaseUrl}${m.image}?t=${new Date().getTime()}` : 'assets/default-avatar.png',
            email: m.email ?? '', office: m.office ?? '', salary: m.salary ?? 0,
            role: m.role ?? '', status: m.status ?? '', position: m.position ?? '',
            team: t.name
          }))
        }));
        this.filteredTeams = [...this.teams];
      },
      error: err => console.error('Failed to load teams:', err)
    });
  }

  onSearch() {
    const search = this.searchTerm.toLowerCase();
    this.filteredTeams = this.teams.filter(team =>
      team.name.toLowerCase().includes(search) ||
      team.members.some(m => `${m.firstname} ${m.lastName}`.toLowerCase().includes(search))
    );
  }

  toggleSortDropdown() { this.sortDropdownOpen = !this.sortDropdownOpen; }

  sortBy(option: string) {
    this.selectedSort = option;
    this.sortDropdownOpen = false;
    let sorted = [...this.teams];
    switch (option) {
      case 'Newest': sorted.sort((a, b) => (b.id ?? 0) - (a.id ?? 0)); break;
      case 'Oldest': sorted.sort((a, b) => (a.id ?? 0) - (b.id ?? 0)); break;
      case 'Descending': sorted.sort((a, b) => b.members.length - a.members.length); break;
    }
    this.filteredTeams = sorted;
  }

openEditModal(team: Team) {
  console.log('Opening edit modal for team:', team);
  this.selectedTeam = { ...team, members: team.members.map(m => ({ ...m })) };
  console.log('Deep copy of selectedTeam:', this.selectedTeam);

  const modalEl = document.getElementById('edit_modal');
  if(modalEl) {
    const modal = new bootstrap.Modal(modalEl);
    modal.show();
    console.log('Bootstrap modal instance created:', modal);
  } else {
    console.error('Edit modal element not found!');
  }
}

  // Delete Modal open
  openDeleteModal(team: Team) {
    this.selectedTeam = team;
    const modalEl = document.getElementById('delete_modal');
    if (modalEl) {
      const modal = new bootstrap.Modal(modalEl);
      modal.show();
    }
  }

  // Confirm Delete
  confirmDelete(): void {
    if (!this.selectedTeam || !this.selectedTeam.id) return;

    this.teamservice.deleteTeam(this.selectedTeam.id).subscribe({
      next: () => {
        this.teams = this.teams.filter(t => t.id !== this.selectedTeam!.id);
        this.filteredTeams = [...this.teams];
        this.selectedTeam = undefined;
        alert('Team deleted successfully!');
      },
      error: (err) => {
        console.error('Failed to delete team:', err);
        alert('Failed to delete team!');
      }
    });
  }

  onStatusFilterChange(status: string, event: any) {
    if (event.target.checked) {
      this.statusFilter.push(status);
    } else {
      this.statusFilter = this.statusFilter.filter(s => s !== status);
    }
    this.applyFilters();
  }

  // Apply both search and status filters
  applyFilters() {
    this.filteredTeams = this.teams.filter(team => {
      // Status filter
      const statusMatch = this.statusFilter.length === 0 || this.statusFilter.includes(team.status);

      // Search filter
      const search = this.searchTerm.toLowerCase();
      const searchMatch =
        team.name.toLowerCase().includes(search) ||
        team.members.some(m => `${m.firstname} ${m.lastName}`.toLowerCase().includes(search));

      return statusMatch && searchMatch;
    });
  }
}
