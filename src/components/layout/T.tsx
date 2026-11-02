'use client';

import React from 'react';
import { useLanguage } from './LanguageProvider';

interface TProps {
  text: string;
  fallback?: string;
  className?: string;
}

export default function T({ text, fallback, className }: TProps) {
  const { t } = useLanguage();
  return <span className={className}>{t(text, fallback)}</span>;
}

export { T };
