import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../service/auth.service';
import { environment } from '../../../environments/environment';

export const authIntercepter: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (req.url.includes('/auth/login')) {
    return next(req);
  }

  const apiBase = environment.apiUrl.replace(/\/+$/, '');
  const isApiRequest =
    req.url.startsWith(apiBase) ||
    req.url.startsWith('/api/') ||
    req.url.startsWith('/');

  const token = authService.getToken();
  let clonedReq = req;

  if (token && isApiRequest) {
    clonedReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  return next(clonedReq).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status === 401 && isApiRequest) {
        authService.logout();
        if (!router.url.startsWith('/login')) {
          router.navigate(['/login']);
        }
      }
      return throwError(() => err);
    })
  );
};
