import { Router } from 'express';
import {
  getConfig, getActiveProfile, switchProfile,
  createProfile, deleteProfile, updateProfile,
  duplicateProfile, migrateToProfiles
} from '../services/config.js';
import { broadcast } from '../services/ws.js';

const router = Router();

// List profiles
router.get('/api/profiles', (req, res) => {
  const config = getConfig();
  res.json({
    profiles: config.profiles || [],
    activeProfile: config.settings.activeProfile || null
  });
});

// Get active profile
router.get('/api/profiles/active', (req, res) => {
  const profile = getActiveProfile();
  if (!profile) return res.json({ legacy: true, pages: getConfig().pages });
  res.json(profile);
});

// Switch profile
router.post('/api/profiles/:id/activate', async (req, res) => {
  try {
    const profile = await switchProfile(req.params.id);
    broadcast('config:updated', { config: getConfig() });
    broadcast('profile:switched', { profileId: profile.id });
    res.json(profile);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Create profile
router.post('/api/profiles', async (req, res) => {
  try {
    const profile = await createProfile(req.body);
    broadcast('config:updated', { config: getConfig() });
    res.status(201).json(profile);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Update profile (rename/icon)
router.put('/api/profiles/:id', async (req, res) => {
  try {
    const profile = await updateProfile(req.params.id, req.body);
    broadcast('config:updated', { config: getConfig() });
    res.json(profile);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Duplicate profile
router.post('/api/profiles/:id/duplicate', async (req, res) => {
  try {
    const { newId, newName } = req.body;
    const profile = await duplicateProfile(req.params.id, newId, newName);
    broadcast('config:updated', { config: getConfig() });
    res.status(201).json(profile);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Delete profile
router.delete('/api/profiles/:id', async (req, res) => {
  try {
    await deleteProfile(req.params.id);
    broadcast('config:updated', { config: getConfig() });
    res.status(204).end();
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Migrate legacy config to profiles
router.post('/api/profiles/migrate', async (req, res) => {
  try {
    await migrateToProfiles();
    broadcast('config:updated', { config: getConfig() });
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
