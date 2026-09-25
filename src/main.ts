import { bootstrapApplication } from '@angular/platform-browser';
import { register as registerSwiper } from 'swiper/element/bundle';
import { appConfig } from './app/app.config';
import { App } from './app/app';

// Registra os web components do Swiper (<swiper-container>, <swiper-slide>).
registerSwiper();

bootstrapApplication(App, appConfig).catch((err) => console.error(err));
