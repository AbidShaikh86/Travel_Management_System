import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { catchError, map, Observable, of, tap } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface UserSession {
  email: string;
  role: 'ADMIN' | 'MANAGER' | 'FINANCE' | 'EMPLOYEE' | string;
  name?: string;
  designation?: string;
  age?: number;
  gender?: string;
  managerId?: number | null;
  departmentId?: number | null;
}

export interface EmployeeProfileResponse {
  name: string;
  age: number | null;
  gender: string | null;
  email: string;
  designation: string | null;
  managerId: number | null;
  departmentId: number | null;
}

export interface GlobalApiResponse {
  process: boolean;
  message: string;
}

export interface LoginResponse {
  token: string;
  type?: string;
  email: string;
  role: string;
  name?: string;
  designation?: string;
  message?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = `${environment.apiUrl}/auth`;
  private http = inject(HttpClient);

  currentUser = signal<UserSession | null>(this.loadStoredUser());

  private get storage(): Storage | null {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage;
    }
    return null;
  }

  login(credentials: { email: string; password: string }): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/login`, credentials).pipe(
      tap((res) => {
        if (res && res.token) {
          this.saveAuthData(res.token, {
            email: res.email,
            role: res.role,
            name: res.name,
            designation: res.designation
          });
        }
      })
    );
  }

  saveAuthData(token: string, user: UserSession): void {
    this.storage?.setItem('token', token);
    this.storage?.setItem('user', JSON.stringify(user));
    this.currentUser.set(user);
  }

  saveToken(token: string): void {
    this.storage?.setItem('token', token);
  }

  getToken(): string | null {
    return this.storage?.getItem('token') ?? null;
  }

  getUser(): UserSession | null {
    return this.currentUser();
  }

  getRole(): string | null {
    const role = this.currentUser()?.role;
    if (!role) return null;
    return role.replace(/^ROLE_/i, '').trim().toUpperCase();
  }

  hasRole(allowedRoles: string[]): boolean {
    const userRole = this.getRole();
    if (!userRole) return false;
    const normalizedAllowed = allowedRoles.map(r => r.replace(/^ROLE_/i, '').trim().toUpperCase());
    return normalizedAllowed.includes(userRole);
  }

  isLoggedIn(): boolean {
    const token = this.getToken();
    if (!token) return false;
    if (this.isTokenExpired(token)) {
      this.logout();
      return false;
    }
    return true;
  }

  private isTokenExpired(token: string): boolean {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return false;
      const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const payload = JSON.parse(decodeURIComponent(escape(atob(base64))));
      if (!payload.exp) return false;
      return payload.exp * 1000 < Date.now();
    } catch {
      return false;
    }
  }

  logout(): void {
    this.storage?.removeItem('token');
    this.storage?.removeItem('user');
    this.currentUser.set(null);
  }

  fetchProfile(): Observable<EmployeeProfileResponse> {
    return this.http.get<EmployeeProfileResponse>(`${environment.apiUrl}/employee/profile`).pipe(
      tap((profile) => {
        if (!profile) return;
        const current = this.currentUser();
        const updated: UserSession = {
          email: profile.email || current?.email || '',
          role: current?.role || 'EMPLOYEE',
          name: profile.name || current?.name,
          designation: profile.designation || current?.designation,
          age: profile.age ?? current?.age,
          gender: profile.gender ?? current?.gender,
          managerId: profile.managerId ?? current?.managerId ?? null,
          departmentId: profile.departmentId ?? current?.departmentId ?? null
        };
        this.storage?.setItem('user', JSON.stringify(updated));
        this.currentUser.set(updated);
      })
    );
  }

  logoutServer(): Observable<void> {
    return this.http.post<GlobalApiResponse>(`${this.apiUrl}/logout`, {}).pipe(
      catchError(() => of(null)),
      map(() => {
        this.logout();
      })
    );
  }

  changePassword(payload: { oldPassword: string; newPassword: string }): Observable<GlobalApiResponse> {
    return this.http.patch<GlobalApiResponse>(`${this.apiUrl}/forgot-password`, payload);
  }

  private loadStoredUser(): UserSession | null {
    const raw = this.storage?.getItem('user');
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as UserSession;
        if (parsed.role) {
          parsed.role = parsed.role.replace(/^ROLE_/i, '').trim().toUpperCase();
        }
        return parsed;
      } catch {}
    }

    const token = this.storage?.getItem('token');
    if (token) {
      try {
        const parts = token.split('.');
        if (parts.length === 3) {
          const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
          const payload = JSON.parse(decodeURIComponent(escape(atob(base64))));
          const role = (payload.role || 'EMPLOYEE').replace(/^ROLE_/i, '').trim().toUpperCase();
          const email = payload.sub || '';
          return {
            email,
            role,
            name: email.split('@')[0]
          };
        }
      } catch {}
    }
    return null;
  }
}
