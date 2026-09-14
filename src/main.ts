import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { configureCognito } from './app/core/auth/cognito.config';

configureCognito();

bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));
