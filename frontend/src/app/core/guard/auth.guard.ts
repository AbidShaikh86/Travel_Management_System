import { inject } from '@angular/core';
import { CanActivateChildFn, CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../service/auth.service';
import { environment } from '../../../environments/environment';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isLoggedIn()) {
    return true;
  }

  router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
  return false;
};

export const authChildGuard: CanActivateChildFn = (childRoute, state) => {
  return authGuard(childRoute, state);
};

export const guestGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isLoggedIn()) {
    router.navigate(['/dashboard/overview']);
    return false;
  }

  return true;
};

export const roleGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isLoggedIn()) {
    router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
    return false;
  }

  const expectedRoles = route.data?.['roles'] as string[] | undefined;

  if (!expectedRoles || expectedRoles.length === 0) {
    return true;
  }

  if (authService.hasRole(expectedRoles)) {
    return true;
  }

  const currentRole = authService.getRole() || 'UNKNOWN';
  if (environment.enableDebugLogs) {
    console.warn(
      `[RoleGuard] Access denied to "${state.url}". Required roles: [${expectedRoles.join(', ')}], current user role: [${currentRole}]`
    );
  }

  router.navigate(['/dashboard/overview'], { queryParams: { unauthorized: '1' } });
  return false;
};
