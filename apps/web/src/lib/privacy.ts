import type { InterfaceLanguage } from './evidence.js';

/**
 * The privacy page, in English and Turkish (KVKK and GDPR). Keep it true to the code: when the
 * accounts API starts keeping something new, add it here in the same pull request.
 */
export interface PrivacyRow {
  readonly item: string;
  readonly what: string;
  readonly why: string;
}

export interface PrivacyText {
  readonly title: string;
  readonly intro: string;
  readonly updated: string;
  readonly readingHeading: string;
  readonly reading: readonly string[];
  readonly accountHeading: string;
  readonly accountIntro: string;
  readonly columns: { readonly item: string; readonly what: string; readonly why: string };
  readonly rows: readonly PrivacyRow[];
  readonly neverHeading: string;
  readonly never: readonly string[];
  readonly cookiesHeading: string;
  readonly cookies: readonly PrivacyRow[];
  readonly cookiesNote: string;
  readonly whereHeading: string;
  readonly where: readonly string[];
  readonly controlHeading: string;
  readonly control: readonly string[];
  readonly accountLink: string;
  readonly lawHeading: string;
  readonly law: readonly string[];
}

/** When the text last changed in substance. Update it with the text. */
export const PRIVACY_UPDATED = '2026-11-12';

const TEXT: Record<InterfaceLanguage, PrivacyText> = {
  en: {
    title: 'Privacy',
    intro:
      'CSPNews keeps as little about you as it can. Reading needs no account, and nothing on this site tracks you.',
    updated: 'Last changed',
    readingHeading: 'When you read',
    reading: [
      'No analytics, no ad trackers and no third-party scripts. Fonts, photos and logos are served from this site.',
      'Your settings, the stories you have read and your word game results are kept in your own browser (local storage). They never leave it unless you sign in.',
      'The site is hosted by Vercel. Like any web host, it handles your IP address to send you the pages. We do not keep logs of it.',
    ],
    accountHeading: 'If you sign in',
    accountIntro:
      'An account is optional. Google sign-in asks Google for an account number only: no email, no name, no photo. A passkey stays on your device; we keep only its public half. This is everything we keep:',
    columns: { item: 'What', what: 'What it is', why: 'Why' },
    rows: [
      { item: 'Account id', what: 'A random id we create', why: 'Ties your account together' },
      {
        item: 'Google link',
        what: 'Google’s account number for you, if you use Google',
        why: 'Recognise you next time',
      },
      {
        item: 'Passkeys',
        what: 'The public half of each passkey, with the dates it was added and last used',
        why: 'Sign in without a password',
      },
      {
        item: 'Name',
        what: 'Optional, whatever you type. Only you see it.',
        why: 'Your account page',
      },
      { item: 'Avatar', what: 'Which avatar you picked', why: 'The header and account page' },
      { item: 'Settings', what: 'Interface language and theme', why: 'The same site everywhere' },
      {
        item: 'Word game',
        what: 'One row per day and language: tries, and whether you found the word',
        why: 'Your streak and stats on every device',
      },
      {
        item: 'Sign-ins',
        what: 'A scrambled (hashed) copy of each sign-in token, and when it expires',
        why: 'Keep you signed in for up to 90 days',
      },
    ],
    neverHeading: 'Never',
    never: [
      'Email address or phone number',
      'Passwords',
      'Birthday, gender or location',
      'Logs of your IP address',
      'Analytics or advertising',
      'Selling or sharing your data',
    ],
    cookiesHeading: 'Cookies',
    cookies: [
      {
        item: 'Sign-in',
        what: 'A random token, readable only by our server',
        why: 'Keeps you signed in. Up to 90 days.',
      },
      {
        item: 'Signed-in hint',
        what: 'Just “1”',
        why: 'Tells the site to ask for your account, so signed-out readers never contact our server',
      },
      {
        item: 'Sign-in in progress',
        what: 'A one-time code while Google or your passkey answers',
        why: 'Protects the sign-in. Gone after 10 minutes at most.',
      },
    ],
    cookiesNote:
      'These are only set when you sign in, and all of them are needed for signing in to work, so there is no cookie banner.',
    whereHeading: 'Where it is kept',
    where: [
      'Accounts are kept in a Cloudflare D1 database in Western Europe. Cloudflare runs the accounts server for us and does not use the data for anything else.',
      'Backups of the database are kept by Cloudflare for up to 30 days, then removed for good.',
    ],
    controlHeading: 'Your control',
    control: [
      'Download everything we keep about you as one file from your account page.',
      'Delete your account there at any time. Every row is removed at once and every device is signed out. Copies in backups disappear within 30 days.',
      'Sign out removes the sign-in from this device. Remove a passkey or add another way to sign in from the same page.',
    ],
    accountLink: 'Go to your account',
    lawHeading: 'Your rights',
    law: [
      'Under the GDPR and Türkiye’s KVKK (Law No. 6698) you can ask what we keep, get a copy, have it corrected or deleted, and object. Download and delete on the account page do this straight away.',
      'We keep this data because you asked for an account (to provide the service you signed up for). We keep it only until you delete the account.',
    ],
  },
  tr: {
    title: 'Gizlilik',
    intro:
      'CSPNews senin hakkında olabildiğince az şey saklar. Okumak için hesap gerekmez ve bu sitede hiçbir şey seni izlemez.',
    updated: 'Son değişiklik',
    readingHeading: 'Okurken',
    reading: [
      'Analitik yok, reklam izleyicisi yok, üçüncü taraf betik yok. Yazı tipleri, fotoğraflar ve logolar bu siteden gelir.',
      'Ayarların, okuduğun haberler ve kelime oyunu sonuçların kendi tarayıcında (yerel depolama) tutulur. Giriş yapmadıkça tarayıcından çıkmaz.',
      'Site Vercel’de barınır. Her web sunucusu gibi Vercel de sayfaları sana gönderebilmek için IP adresini işler. Biz bunun kaydını tutmayız.',
    ],
    accountHeading: 'Giriş yaparsan',
    accountIntro:
      'Hesap isteğe bağlıdır. Google ile girişte Google’dan yalnızca bir hesap numarası isteriz: e-posta, ad ya da fotoğraf yok. Geçiş anahtarı cihazında kalır; biz yalnızca açık (public) yarısını saklarız. Sakladığımız her şey bu kadar:',
    columns: { item: 'Ne', what: 'Nedir', why: 'Neden' },
    rows: [
      {
        item: 'Hesap kimliği',
        what: 'Bizim oluşturduğumuz rastgele bir kimlik',
        why: 'Hesabını bir arada tutar',
      },
      {
        item: 'Google bağlantısı',
        what: 'Google kullanıyorsan, Google’ın sana verdiği hesap numarası',
        why: 'Seni bir dahaki sefere tanımak',
      },
      {
        item: 'Geçiş anahtarları',
        what: 'Her geçiş anahtarının açık yarısı, eklendiği ve son kullanıldığı tarihlerle',
        why: 'Şifresiz giriş',
      },
      {
        item: 'Ad',
        what: 'İsteğe bağlı, ne yazarsan. Yalnızca sen görürsün.',
        why: 'Hesap sayfan',
      },
      { item: 'Avatar', what: 'Seçtiğin avatar', why: 'Üst bilgi ve hesap sayfası' },
      { item: 'Ayarlar', what: 'Arayüz dili ve tema', why: 'Her yerde aynı site' },
      {
        item: 'Kelime oyunu',
        what: 'Her gün ve dil için bir satır: deneme sayısı ve kelimeyi bulup bulmadığın',
        why: 'Serin ve istatistiklerin her cihazda',
      },
      {
        item: 'Girişler',
        what: 'Her giriş anahtarının karıştırılmış (hash) bir kopyası ve bitiş tarihi',
        why: 'Seni 90 güne kadar oturumda tutmak',
      },
    ],
    neverHeading: 'Asla',
    never: [
      'E-posta adresi ya da telefon numarası',
      'Şifre',
      'Doğum tarihi, cinsiyet ya da konum',
      'IP adresi kayıtları',
      'Analitik ya da reklam',
      'Verini satmak ya da paylaşmak',
    ],
    cookiesHeading: 'Çerezler',
    cookies: [
      {
        item: 'Oturum',
        what: 'Yalnızca sunucumuzun okuyabildiği rastgele bir anahtar',
        why: 'Seni oturumda tutar. En çok 90 gün.',
      },
      {
        item: 'Oturum işareti',
        what: 'Yalnızca “1”',
        why: 'Siteye hesabını sormasını söyler; böylece giriş yapmamış okurlar sunucumuza hiç bağlanmaz',
      },
      {
        item: 'Süren giriş',
        what: 'Google ya da geçiş anahtarın yanıt verirken tek kullanımlık bir kod',
        why: 'Girişi korur. En çok 10 dakikada silinir.',
      },
    ],
    cookiesNote:
      'Bunlar yalnızca giriş yaptığında oluşur ve hepsi girişin çalışması için gereklidir; bu yüzden çerez uyarısı yoktur.',
    whereHeading: 'Nerede saklanır',
    where: [
      'Hesaplar, Batı Avrupa’daki bir Cloudflare D1 veritabanında tutulur. Hesap sunucusunu bizim için Cloudflare çalıştırır ve veriyi başka bir amaçla kullanmaz.',
      'Veritabanının yedekleri Cloudflare’de en çok 30 gün kalır, sonra kalıcı olarak silinir.',
    ],
    controlHeading: 'Kontrol sende',
    control: [
      'Hakkında sakladığımız her şeyi hesap sayfandan tek bir dosya olarak indir.',
      'Hesabını orada istediğin an sil. Her kayıt hemen silinir ve tüm cihazlarda oturumun kapanır. Yedeklerdeki kopyalar 30 gün içinde yok olur.',
      'Çıkış yap, bu cihazdaki oturumu kapatır. Aynı sayfadan geçiş anahtarı kaldırabilir ya da başka bir giriş yolu ekleyebilirsin.',
    ],
    accountLink: 'Hesabına git',
    lawHeading: 'Hakların',
    law: [
      'KVKK (6698 sayılı Kanun) ve GDPR kapsamında neleri sakladığımızı sorabilir, bir kopyasını alabilir, düzeltilmesini ya da silinmesini isteyebilir ve itiraz edebilirsin. Hesap sayfasındaki indirme ve silme bunu hemen yapar.',
      'Bu verileri, hesap açmak istediğin için (kaydolduğun hizmeti sunmak amacıyla) tutarız. Yalnızca hesabını silene kadar saklarız.',
    ],
  },
};

export function privacyText(language: InterfaceLanguage): PrivacyText {
  return TEXT[language];
}

export function privacyPath(language: InterfaceLanguage): string {
  return language === 'tr' ? '/privacy/tr' : '/privacy';
}
