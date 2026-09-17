import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export interface ApplicationUserProfile {
  cognitoSub: string;
  email: string;
  rut: string | null;
  nombre: string;
  apellido: string;
  rol: 'Admin';
}

@Injectable({ providedIn: 'root' })
export class UserApiService {
  constructor(private readonly http: HttpClient) {}
  sync(profile: ApplicationUserProfile): Observable<unknown> {
    return this.http.post('/api/users', profile);
  }
}
