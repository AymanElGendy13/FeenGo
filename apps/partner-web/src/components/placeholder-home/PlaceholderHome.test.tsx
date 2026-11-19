import { act, render, screen } from '@testing-library/react';
import userEventFree from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ar from '../../../messages/ar.json';
import en from '../../../messages/en.json';
import { resolveLocale, type Locale } from '@/i18n/locale';
import { PlaceholderHome } from './PlaceholderHome';

void userEventFree;
