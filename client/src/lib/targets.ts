import { storageGet, storageSet } from './storage';
import type { Target, TargetDraft } from '../types';

const TARGETS_KEY = 'verity.targets.v1';
const CURRENT_VERSION = 2;

export function getStoredTargets(): Target[] {
  try {
    const targets = storageGet<Target[]>(TARGETS_KEY, []);
    if (!targets) return [];
    return targets
      .filter(t => t && t.id && t.deadline)
      .map(t => migrateTarget(t))
      .sort((a, b) => {
        if (a.completed !== b.completed) return Number(a.completed) - Number(b.completed);
        if (a.isPrimary !== b.isPrimary) return Number(b.isPrimary) - Number(a.isPrimary);
        return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
      });
  } catch (e) {
    console.error('Failed to load targets:', e);
    return [];
  }
}

function migrateTarget(target: Target): Target {
  if ((target as any).version === CURRENT_VERSION) return target;
  return { ...target, version: CURRENT_VERSION };
}

export function saveStoredTargets(targets: Target[]): void {
  try {
    storageSet(TARGETS_KEY, targets.map(t => ({ ...t, version: CURRENT_VERSION })));
  } catch (e) {
    console.error('Failed to save targets:', e);
  }
}

export function createTarget(draft: TargetDraft): Target {
  return {
    id: crypto.randomUUID(),
    title: draft.title.trim(),
    deadline: draft.deadline,
    description: draft.description?.trim() || '',
    color: draft.color,
    isPrimary: draft.isPrimary,
    completed: false,
    createdAt: new Date().toISOString(),
    completedAt: null,
  };
}
