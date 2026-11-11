export {
  AVATAR_DESIGNS,
  AVATAR_GROUNDS,
  avatarSvg,
  formatAvatar,
  initialOf,
  parseAvatar,
  randomAvatar,
} from './avatar.js';
export type { Avatar, AvatarDesignId, AvatarGround, AvatarSvgOptions } from './avatar.js';

export {
  DEFAULT_SETTINGS,
  MAX_NAME_LENGTH,
  ProfilePatchSchema,
  SESSION_DAYS,
  hashSessionToken,
  newAccountId,
  newSessionToken,
  normalizeName,
  profileToJson,
  sessionExpiry,
} from './account.js';
export type {
  InterfaceLanguage,
  ProfilePatch,
  ReaderProfile,
  ReaderSettings,
  SignInMethod,
  Theme,
} from './account.js';

export {
  GAME_LANGUAGES,
  GameImportSchema,
  GameResultSchema,
  MAX_TRIES,
  gameDayAt,
  mergeResults,
  rejectReason,
} from './game.js';
export type { GameDay, GameLanguage, GameResult, MergeOutcome } from './game.js';
