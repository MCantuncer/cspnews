import { EVIDENCE_LABEL_VALUES } from '@cspnews/core';

import type { EvidenceLabel, InterfaceLanguage } from './evidence.js';
import { localePath } from './locale.js';

/**
 * The About page, in English and Turkish: what CSPNews is, how a story is made, what each
 * evidence mark means and how corrections are shown. Keep it true to the code: when the rules
 * in `packages/verify` or the steps in `docs/publishing.md` change, change this text in the
 * same pull request.
 */
export interface AboutSection {
  readonly heading: string;
  readonly paragraphs: readonly string[];
}

export interface AboutText {
  readonly title: string;
  readonly intro: string;
  readonly updated: string;
  readonly what: AboutSection;
  readonly how: AboutSection;
  readonly marksHeading: string;
  readonly marksIntro: string;
  readonly marks: Readonly<Record<EvidenceLabel, string>>;
  readonly marksNotes: readonly string[];
  readonly hot: AboutSection;
  readonly corrections: AboutSection;
  readonly money: AboutSection;
  readonly privacyLink: string;
  /** The link to this page from Settings. */
  readonly linkLabel: string;
}

/** When the text last changed in substance. Update it with the text. */
export const ABOUT_UPDATED = '2026-11-12';

/** The order the marks are explained in: strongest first, as the rules list them. */
export const ABOUT_MARKS: readonly EvidenceLabel[] = EVIDENCE_LABEL_VALUES;

const TEXT: Record<InterfaceLanguage, AboutText> = {
  en: {
    title: 'About CSPNews',
    intro:
      'CSPNews is a small, personal newsroom. It publishes short bulletins at set hours, shows how well each story is backed, and then ends.',
    updated: 'Last changed',
    what: {
      heading: 'What you get',
      paragraphs: [
        'Four bulletins on weekdays, at 07:30, 12:30, 18:30 and 22:30 Istanbul time, and two at weekends, at 07:30 and 18:30. Each has three sections: Türkiye, Tech and AI, and Around the World.',
        'A bulletin has an end. There is no endless feed, no comments and nothing that asks you to keep scrolling. Every story is written in both English and Turkish.',
      ],
    },
    how: {
      heading: 'How a story is made',
      paragraphs: [
        'Fixed rules, not a person and not an AI, read the feeds of a set list of news outlets, group the articles that report the same event, and work out the story’s evidence mark from who reported it.',
        'An AI language model then reads those articles and writes the story in both languages. It may use only what the articles say, and it names the outlet behind each claim and quote. A quote given in another language than the speaker used is marked as translated.',
        'No person reads a story before it is published. That is why every story shows its sources, its evidence mark and its timeline: you can check for yourself where each part comes from.',
        'Photos come from the outlets that reported the story and carry their credit.',
      ],
    },
    marksHeading: 'What the evidence marks mean',
    marksIntro:
      'The mark is worked out by rules from the outlets behind a story. Outlets with the same owner count as one.',
    marks: {
      confirmed:
        'Reported by at least two outlets with different owners, one of them a news agency or an established outlet. A statement from the organisation itself plus one independent outlet also counts. For a story from Türkiye, the outlets must not all stand on the same political side.',
      reported:
        'Reported by at least two outlets with different owners, but without a news agency or established outlet among them, or, for a story from Türkiye, only by outlets on one political side.',
      'single-source':
        'Reported by one owner only, however many of its outlets ran it. Treat it with care until others follow.',
      disputed: 'A fact-checking organisation has published on this story. Read what it found.',
    },
    marksNotes: [
      'An outlet that only republished another outlet’s text is listed but never counted.',
      '“Developing” beside a mark means the story is young and outlets are still adding to it. The mark can change, and the timeline shows when it did.',
    ],
    hot: {
      heading: 'Hot News',
      paragraphs: [
        'Between bulletins, rules watch for a story that several outlets pick up in a short time. No AI is involved, so a Hot News story shows one outlet’s own headline, in its own language, until the next bulletin covers it.',
      ],
    },
    corrections: {
      heading: 'Corrections',
      paragraphs: [
        'When a story turns out to be wrong or changes, it is fixed on its own page and the change is added to the story’s timeline with the time and what changed.',
      ],
    },
    money: {
      heading: 'Money and independence',
      paragraphs: [
        'CSPNews is run by one person. It has no adverts, no sponsors and no paid placement, and it does not track readers.',
      ],
    },
    privacyLink: 'What CSPNews keeps about you',
    linkLabel: 'About CSPNews and how stories are made',
  },
  tr: {
    title: 'CSPNews hakkında',
    intro:
      'CSPNews küçük, kişisel bir haber odasıdır. Belirli saatlerde kısa bültenler yayımlar, her haberin ne kadar sağlam dayanağı olduğunu gösterir ve orada biter.',
    updated: 'Son değişiklik',
    what: {
      heading: 'Ne sunuyor',
      paragraphs: [
        'Hafta içi İstanbul saatiyle 07.30, 12.30, 18.30 ve 22.30’da dört bülten, hafta sonu 07.30 ve 18.30’da iki bülten. Her bültende üç bölüm var: Türkiye, Teknoloji ve yapay zekâ, Dünya.',
        'Bültenin bir sonu vardır. Sonsuz akış, yorumlar ya da sizi kaydırmaya devam ettirmeye çalışan hiçbir şey yok. Her haber hem Türkçe hem İngilizce yazılır.',
      ],
    },
    how: {
      heading: 'Bir haber nasıl hazırlanır',
      paragraphs: [
        'Belirli bir yayın listesinin akışlarını bir insan ya da yapay zekâ değil, sabit kurallar okur. Bu kurallar aynı olayı aktaran haberleri bir araya getirir ve haberi kimlerin bildirdiğine bakarak kanıt işaretini belirler.',
        'Ardından bir yapay zekâ dil modeli bu haberleri okur ve haberi iki dilde yazar. Yalnızca kaynak haberlerde yazanları kullanabilir; her iddianın ve alıntının hangi yayına ait olduğunu belirtir. Konuşanın kullandığı dilden başka bir dilde verilen alıntı “çeviri” olarak işaretlenir.',
        'Haberleri yayımlanmadan önce bir insan okumaz. Her haberin kaynaklarını, kanıt işaretini ve seyrini göstermesinin nedeni budur: Her bölümün nereden geldiğini kendiniz kontrol edebilirsiniz.',
        'Fotoğraflar haberi bildiren yayınlardan alınır ve kaynağı belirtilir.',
      ],
    },
    marksHeading: 'Kanıt işaretleri ne anlama geliyor',
    marksIntro:
      'İşaret, haberin arkasındaki yayınlara bakılarak kurallarla belirlenir. Aynı sahibe ait yayınlar tek sayılır.',
    marks: {
      confirmed:
        'Sahipleri farklı en az iki yayın bildirdi ve bunlardan biri haber ajansı ya da köklü bir yayın. Kurumun kendi açıklaması ile bağımsız bir yayın da yeterlidir. Türkiye haberlerinde yayınların hepsi aynı siyasi kesimden olamaz.',
      reported:
        'Sahipleri farklı en az iki yayın bildirdi; ancak aralarında haber ajansı ya da köklü bir yayın yok ya da Türkiye haberlerinde hepsi aynı siyasi kesimden.',
      'single-source':
        'Kaç yayınında çıkmış olursa olsun, haberi tek bir sahip bildirdi. Başkaları da bildirene kadar temkinli yaklaşın.',
      disputed: 'Bir doğrulama kuruluşu bu haberle ilgili yayın yaptı. Ne bulduğunu okuyun.',
    },
    marksNotes: [
      'Başka bir yayının metnini yalnızca yeniden yayımlayan kaynak listelenir, ama hiçbir zaman sayılmaz.',
      'İşaretin yanındaki “Gelişiyor”, haberin yeni olduğunu ve yayınların hâlâ ekleme yaptığını gösterir. İşaret değişebilir; ne zaman değiştiği haberin seyrinde görünür.',
    ],
    hot: {
      heading: 'Son Dakika',
      paragraphs: [
        'Bültenler arasında kurallar, kısa sürede birkaç yayının birden ele aldığı haberleri izler. Yapay zekâ kullanılmaz; bu yüzden bir son dakika haberi, sıradaki bülten ele alana kadar bir yayının kendi başlığını kendi dilinde gösterir.',
      ],
    },
    corrections: {
      heading: 'Düzeltmeler',
      paragraphs: [
        'Bir haberin yanlış olduğu anlaşılırsa ya da haber değişirse kendi sayfasında düzeltilir; değişiklik, saati ve neyin değiştiğiyle birlikte haberin seyrine eklenir.',
      ],
    },
    money: {
      heading: 'Para ve bağımsızlık',
      paragraphs: [
        'CSPNews’u tek bir kişi yürütür. Reklam, sponsor ya da ücretli yerleştirme yoktur ve okurlar izlenmez.',
      ],
    },
    privacyLink: 'CSPNews sizinle ilgili neleri saklıyor',
    linkLabel: 'CSPNews hakkında ve haberler nasıl hazırlanır',
  },
};

export function aboutText(lang: InterfaceLanguage): AboutText {
  return TEXT[lang];
}

/** `/about`, `/tr/about`. */
export function aboutPath(lang: InterfaceLanguage): string {
  return localePath('/about', lang);
}
