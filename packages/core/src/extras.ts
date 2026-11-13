import { z } from 'zod';

import { StoryImageSchema } from './image.js';
import { LANGUAGES, type Language } from './language.js';

/**
 * The two parts of a bulletin that sit outside the news sections:
 *
 * - **And finally** (`AndFinallySchema`): the bulletin's light close. A few true light stories,
 *   each told straight with one line of wit in our own voice (`aside`), and backstage rumours
 *   we could not confirm, each naming who is saying it.
 * - **Transfers** (`TransferMoveSchema`): football transfers in the Süper Lig and the big
 *   European leagues, each followed along four stages from first talk to signature.
 *
 * Neither is a story: they have no body, no evidence drawer and no day-line timeline, and they
 * never count towards reading time, the one-minute brief or "three things to remember".
 */

const text = (max: number) => z.string().trim().min(1).max(max);
const wordCount = (value: string) => value.split(/\s+/).filter(Boolean).length;
const id = text(64);
const bilingual = <Version extends z.ZodType>(version: Version) =>
  z.object({ en: version, tr: version }).strict();

/** Light stories are true stories: only these two evidence labels may carry one. */
export const LIGHT_LABEL_VALUES = ['confirmed', 'reported'] as const;

/**
 * What a light story is about, for its badge: television and film, music, well-known people,
 * odd news (records, mix-ups, small wonders), animals, and life around town.
 */
export const LIGHT_KINDS = ['screen', 'music', 'people', 'odd', 'animals', 'town'] as const;

/** Where a light story or a rumour was read. */
export const ExtraSourceSchema = z.object({ sourceId: id, url: z.url() }).strict();

/** One light story in one language. */
export const LightVersionSchema = z
  .object({
    /** Told straight: the headline never carries the joke. */
    title: text(90),
    /** One plain sentence with the facts. */
    gist: text(180),
    /** The one line of wit, about the situation and never about a person's looks or private life. */
    aside: text(140),
  })
  .strict();

export const LightStorySchema = z
  .object({
    id,
    kind: z.enum(LIGHT_KINDS),
    label: z.enum(LIGHT_LABEL_VALUES),
    versions: bilingual(LightVersionSchema),
    sources: z.array(ExtraSourceSchema).min(1).max(5),
    /** The outlet photo, when one of the sources had a real news photo; saved like a story's. */
    image: StoryImageSchema.optional(),
  })
  .strict();

/** Talk we could not confirm, with the outlet that is saying it. */
export const RumourSchema = z
  .object({
    id,
    kind: z.enum(LIGHT_KINDS),
    versions: bilingual(z.object({ title: text(110) }).strict()),
    heardFrom: ExtraSourceSchema,
  })
  .strict();

/** At most four items in all, so the close stays a short read. */
export const AND_FINALLY_MAX = 4;

export const AndFinallySchema = z
  .object({
    light: z.array(LightStorySchema).max(AND_FINALLY_MAX),
    rumours: z.array(RumourSchema).max(AND_FINALLY_MAX),
  })
  .strict()
  .refine(
    (close) => {
      const count = close.light.length + close.rumours.length;
      return count >= 1 && count <= AND_FINALLY_MAX;
    },
    `And finally holds 1 to ${String(AND_FINALLY_MAX)} items`,
  );

/** The leagues Transfers follows: the Süper Lig and Europe's big leagues. */
export const TRANSFER_LEAGUES = [
  'super-lig',
  'premier-league',
  'laliga',
  'serie-a',
  'bundesliga',
  'ligue-1',
  'eredivisie',
  'primeira-liga',
] as const;

/**
 * How far a move has gone. `talk`: an outlet links the player with the club. `talks`: the clubs
 * or the player's side are negotiating. `agreed`: a fee or terms are agreed. `signed`: the club
 * has announced the signing. Only the club's own announcement makes a move `signed`.
 */
export const TRANSFER_STAGES = ['talk', 'talks', 'agreed', 'signed'] as const;

export type TransferStage = (typeof TRANSFER_STAGES)[number];

const stageIndex = (stage: TransferStage) => TRANSFER_STAGES.indexOf(stage);

/** A number worth showing large on the move's page (fee, contract length). */
export const TransferFactSchema = z.object({ value: text(24), label: text(60) }).strict();

/** The move in one language. */
export const TransferVersionSchema = z
  .object({
    /** 3 to 9 words for the Contents list, with both clubs or the player. */
    shortTitle: text(80).refine(
      (value) => wordCount(value) >= 3 && wordCount(value) <= 9,
      'Use 3 to 9 words',
    ),
    title: text(140),
    /** Where the move stands now, in one or two sentences. */
    now: text(240),
    /** What would take it to `signed`; left out once it is signed. */
    signedWhen: text(200).optional(),
    facts: z.array(TransferFactSchema).max(2).optional(),
  })
  .strict();

/** The day a move first reached a stage. */
export const TransferStepSchema = z
  .object({ stage: z.enum(TRANSFER_STAGES), on: z.iso.date() })
  .strict();

/** One outlet reporting the move, at the stage it reported. */
export const TransferReportSchema = z
  .object({ sourceId: id, url: z.url(), stage: z.enum(TRANSFER_STAGES), on: z.iso.date() })
  .strict();

export const TransferMoveSchema = z
  .object({
    id,
    /** The league of the buying club. */
    league: z.enum(TRANSFER_LEAGUES),
    from: text(60),
    to: text(60),
    stage: z.enum(TRANSFER_STAGES),
    /** True once the buying club itself has announced the move or the agreement. */
    clubConfirmed: z.boolean(),
    steps: z.array(TransferStepSchema).min(1).max(TRANSFER_STAGES.length),
    reports: z.array(TransferReportSchema).min(1).max(8),
    versions: bilingual(TransferVersionSchema),
    updatedAt: z.iso.datetime({ offset: true }),
  })
  .strict()
  .superRefine((move, context) => {
    const issue = (message: string, path: (string | number)[] = []) => {
      context.addIssue({ code: 'custom', message, path });
    };
    move.steps.forEach((step, index) => {
      const previous = move.steps[index - 1];
      if (previous && stageIndex(step.stage) <= stageIndex(previous.stage)) {
        issue('Steps go forward one stage at a time, in order', ['steps', index]);
      }
      if (previous && step.on < previous.on) {
        issue('Steps are in date order', ['steps', index]);
      }
    });
    if (move.steps.at(-1)?.stage !== move.stage) {
      issue('The last step is the current stage', ['steps']);
    }
    if (move.stage === 'signed' && !move.clubConfirmed) {
      issue('Only the club’s own announcement makes a move signed', ['clubConfirmed']);
    }
    for (const language of LANGUAGES) {
      const version = move.versions[language];
      if ((move.stage === 'signed') === (version.signedWhen !== undefined)) {
        issue('Say what would make it signed, until it is', ['versions', language, 'signedWhen']);
      }
    }
    if ((move.versions.en.facts?.length ?? 0) !== (move.versions.tr.facts?.length ?? 0)) {
      issue('Both versions need the same number of facts', ['versions']);
    }
  });

/** At most six moves a bulletin: the ones that moved since the last one. */
export const TRANSFERS_MAX = 6;

export type ExtraSource = z.infer<typeof ExtraSourceSchema>;
export type LightKind = (typeof LIGHT_KINDS)[number];
export type LightStory = z.infer<typeof LightStorySchema>;
export type Rumour = z.infer<typeof RumourSchema>;
export type AndFinally = z.infer<typeof AndFinallySchema>;
export type TransferLeague = (typeof TRANSFER_LEAGUES)[number];
export type TransferStep = z.infer<typeof TransferStepSchema>;
export type TransferReport = z.infer<typeof TransferReportSchema>;
export type TransferMove = z.infer<typeof TransferMoveSchema>;
export type TransferVersion = z.infer<typeof TransferVersionSchema>;

/** A light story as one reader reads it. */
export type LocalLightStory = Omit<LightStory, 'versions'> &
  z.infer<typeof LightVersionSchema> & { language: Language };

/** A rumour as one reader reads it. */
export type LocalRumour = Omit<Rumour, 'versions'> & { title: string; language: Language };

/** A move as one reader reads it. */
export type LocalTransferMove = Omit<TransferMove, 'versions'> &
  TransferVersion & { language: Language };

export function lightIn(story: LightStory, language: Language): LocalLightStory {
  const { versions, ...shared } = story;
  return { ...shared, ...versions[language], language };
}

export function rumourIn(rumour: Rumour, language: Language): LocalRumour {
  const { versions, ...shared } = rumour;
  return { ...shared, ...versions[language], language };
}

export function transferIn(move: TransferMove, language: Language): LocalTransferMove {
  const { versions, ...shared } = move;
  return { ...shared, ...versions[language], language };
}
