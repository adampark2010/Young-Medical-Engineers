/**
 * APPROVED COPY. Source of truth: YME_website_update_instructions.docx
 * (July 2026). Every string below is either a REPLACE WITH block from that
 * document, used word for word, or existing copy the document says to keep.
 * Do not edit wording here without an updated document.
 *
 * Where the document is silent, the previous site's text is carried forward
 * (marked "carried"), or a TODO is left. TODOs are listed in the README.
 */
import { SHOW_DEMONSTRATIONS, demonstrations } from './provisional-demonstrations';

export const splash = {
  name: 'Young Medical Engineers',
  topStrip: 'A student nonprofit · est. 2026',
  subline: 'Free tutoring · Keynote speakers · Design challenges',
  enterPrompt: 'click anywhere to begin',
  freeAlways: 'Free. Always.',
  metaDescription:
    'A nonprofit run by high school students, introducing others to biomedical engineering through free tutoring, keynote talks, and hands-on events.',
} as const;

export const mission = {
  eyebrow: 'Our mission', // carried
  heading: 'Curiosity, given tools.',
  paragraphs: [
    'Most students never encounter biomedical engineering until college, if they encounter it at all. Young Medical Engineers, a nonprofit founded and run by high school students, exists to change that.',
    'It is one of the most important fields in modern medicine, and our goal is to introduce more students to it while they still have time to pursue it.',
  ],
} as const;

export const about = {
  eyebrow: 'About us', // carried
  heading: 'Built by the curious, for the curious.',
  intro:
    'Young Medical Engineers is a nonprofit founded and run by high school students. Our mission is to introduce more students to biomedical engineering, a field most people never hear about until college. We pursue this in two ways. First, we make the field visible and engaging through keynote speakers, talks with working engineers, design challenges, and hands-on demonstrations. Second, we support interested students by offering free tutoring in the science and math courses that lead into the field.',
  values: [
    {
      name: 'Access',
      text: 'Every program we offer is free, and it always will be. The only requirement is to sign up. We believe cost should never determine who has the chance to explore this field.',
    },
    {
      name: 'Craft',
      text: 'We prioritize hands-on learning over passive instruction. Whenever possible, we give students the chance to build and test real projects themselves, rather than only reading about them.',
    },
    {
      name: 'Mentorship',
      text: 'Our mentors are close to the experience of the students they guide. They are undergraduate and graduate students in biomedical engineering, along with practicing engineers, many of whom were in the same position not long ago.',
    },
  ],
} as const;

export type Program = { readonly name: string; readonly text: string };
export type ProgramGroup = { readonly label: string; readonly programs: readonly Program[] };

const buildingInterest: Program[] = [
  {
    name: 'Keynote speakers and talks',
    text: 'We host keynote events and smaller talks with people who work in biomedical engineering, including researchers, medical device founders, and leaders in the field. They speak with students in person and online about what the work actually involves, including its challenges, so that students can meet people whose careers they might imagine pursuing.',
  },
  {
    name: 'Design challenges',
    text: 'Students work on a real medical problem, such as making a treatment more affordable or improving recovery, and present their proposals to professionals in the field. We award prizes, and no lab or prior experience is required to take part. A strong idea is enough.',
  },
];
if (SHOW_DEMONSTRATIONS) buildingInterest.push(demonstrations);

export const programs = {
  // TODO(copy): the document supplies the intro line and the three group
  // labels but no page title or eyebrow. The previous eyebrow ("Three
  // programs, one workshop") is no longer accurate, so the page name stands
  // in as the title and the eyebrow is left empty.
  eyebrow: '',
  heading: 'Programs',
  intro:
    'Our programs serve two purposes: introducing students to biomedical engineering, and supporting those who decide to pursue it.',
  groups: [
    { label: 'Building interest', programs: buildingInterest },
    {
      label: 'Supporting students',
      programs: [
        {
          name: 'Free tutoring',
          text: 'Biomedical engineering builds on biology, chemistry, physics, and math, so these are the subjects we tutor, one on one and at no cost. When a student becomes interested, we make sure coursework is not what holds them back. Our tutors are students themselves, a few steps further along.',
        },
      ],
    },
    {
      label: 'Expanding our reach',
      programs: [
        {
          name: 'Chapters',
          text: 'Any student can start a chapter at their own school. We provide a guide for running it, connections to our volunteers, and a small startup grant. From there, the chapter is theirs to lead.',
        },
      ],
    },
  ] as readonly ProgramGroup[],
} as const;

export const tutoring = {
  eyebrow: 'Student sign-up', // carried
  heading: 'Learn with someone a few steps ahead.',
  body:
    'Tell us what you are working on, and we will match you with a volunteer tutor: an undergraduate or graduate student in biomedical engineering. The service is free, held online, and scheduled around your availability. We cover the science and math courses that lead into the field, from introductory biology through the classes students take just before college.',
  form: {
    fields: {
      name: 'Student name', // carried
      email: 'Email', // carried
      grade: 'Grade level', // carried
      subject: 'Subject', // carried
      goals: 'What are you working toward?', // carried
    },
    gradeOptions: ['Middle school', '9th grade', '10th grade', '11th grade', '12th grade'], // carried
    subjectOptions: [
      'Biology',
      'Chemistry',
      'Physics',
      'Math, from algebra through calculus',
      'Anatomy & physiology',
      'AP and standardized-test science',
    ],
    submit: 'Request a tutor', // carried
    successHeading: 'Request received.', // carried
    success: 'A coordinator will email you shortly to match you with a tutor and arrange your first session.',
    // carried; the em dash in the previous version replaced with a period per global rule 1
    error: 'Something went wrong sending your request. Please email youngmedicalengineers@gmail.com directly.',
  },
} as const;

export const volunteer = {
  // TODO(copy): the document says this heading may be broadened now that
  // tutoring is not the only way to help. No replacement was supplied, so the
  // previous eyebrow is carried forward.
  eyebrow: 'Become a tutor',
  heading: 'A few hours of your time can make a meaningful difference for a student.',
  body:
    'If you study or work in biomedical or medical engineering, or teach the sciences that lead into it, we would welcome your involvement. Volunteers can tutor students, give talks about their work, judge design challenges, or help run demonstration events. You set your own availability, and we handle the scheduling and matching. Most of our volunteers come from university programs and local BMES chapters.',
  form: {
    fields: {
      name: 'Name', // carried
      email: 'Email', // carried
      institution: 'Institution / program', // carried
      help: "How you'd like to help",
      availability: 'Availability', // carried
      subjects: 'Subjects you can teach', // carried
    },
    helpOptions: [
      'Tutor',
      'Give a talk',
      'Judge challenges',
      ...(SHOW_DEMONSTRATIONS ? ['Help with demonstrations'] : []),
    ],
    availabilityOptions: [
      '1 hour / week', // carried
      '2–3 hours / week', // carried (en dash, not an em dash)
      '4+ hours / week', // carried
      'Occasional, for events and challenges',
    ],
    submit: 'Apply to volunteer', // carried
    successHeading: 'Application received.', // carried
    success: 'Thank you for applying. We will follow up with a brief orientation and your first match, usually within a week.',
    error: 'We were unable to send your application. Please email youngmedicalengineers@gmail.com directly, and we will take it from there.',
  },
} as const;

export const donate = {
  eyebrow: 'Donate', // carried
  heading: "Every program is free because you aren't required to be.",
  body: [
    'Young Medical Engineers runs on donations and volunteer time, and every program we offer is free to students. Your support pays for the things that make that possible: hosting keynote speakers and events, running free tutoring, and funding design challenges and their prizes. As a small, student-run organization, we keep overhead low, so your gift reaches students directly.',
    'If you would like to support our work, please consider donating. Any amount helps, and all of it goes back into reaching more students.',
  ],
  status:
    'Young Medical Engineers is organized as a nonprofit and is pursuing federal 501(c)(3) recognition. Once it is granted, contributions are tax-deductible to the fullest extent of the law.',
  paymentLine: 'Donations can be made through PayPal. For other ways to give, please contact us.',
  button: 'Donate with PayPal', // carried
} as const;

export const contact = {
  eyebrow: 'Contact', // carried
  heading: 'The door is open.',
  // The intro is rendered with the email and Instagram handle as links.
  intro: {
    before: 'Whether you are a student, parent, teacher, or professional in the field, we would be glad to hear from you. For a classroom talk, a tutoring match, a partnership, or any other question, email us at ',
    email: 'youngmedicalengineers@gmail.com',
    middle: ' or reach us on Instagram at ',
    instagram: '@ym_engineers',
    after: '.',
  },
  faq: [
    {
      q: 'Is tutoring really free?',
      a: 'Yes. All of our programs are free, and that will not change.',
    },
    {
      q: 'Who are the tutors and speakers?',
      a: 'They are volunteer undergraduate and graduate students in biomedical and medical engineering, along with practicing engineers and keynote speakers who contribute to our talks and challenges.',
    },
    {
      q: 'What do you do?',
      a: 'We introduce students to biomedical engineering through keynote speakers, talks, design challenges, and demonstrations, and we support them with free tutoring in the sciences that lead into the field.',
    },
    {
      q: 'Where do you operate?',
      a: 'Tutoring and talks are held online and available anywhere. In-person demonstrations and events take place wherever we have volunteers.',
    },
  ],
  form: {
    fields: {
      name: 'Name', // carried
      email: 'Email', // carried
      topic: 'Topic', // carried
      message: 'Message', // carried
    },
    topicOptions: [
      SHOW_DEMONSTRATIONS ? 'Request a talk or demo' : 'Request a talk',
      'Tutoring question',
      'Volunteering',
      'Donations & partnerships',
      'Something else',
    ],
    submit: 'Send', // carried
    successHeading: 'Message received.', // carried
    success:
      'Thank you for reaching out. We read every message and respond as soon as we can, typically within a few days. As a small volunteer team, we appreciate your patience.',
    // carried; the em dash in the previous version replaced with a period per global rule 1
    error: 'Something went wrong sending your message. Please email youngmedicalengineers@gmail.com directly.',
  },
} as const;

export const board = {
  eyebrow: 'The people behind the bench', // carried
  heading: 'Our board.', // carried
  intro:
    'Ten people, one conviction: every curious student deserves a way into this field. Photographs and full biographies are on their way.', // carried
  bioComingSoon: 'Bio coming soon.',
} as const;

export const impact = {
  eyebrow: 'Our impact so far', // carried
  heading: 'Numbers, honestly kept.', // carried
  paragraph:
    'Young Medical Engineers launched in 2026. We would rather report accurate figures than inflated ones, so this page will grow as we host events and work with more students.',
} as const;

export const shared = {
  formNote: 'All fields are required.', // carried
  chooseOption: 'Choose an option', // select placeholder (UI text)
  skipLink: 'Skip to content', // UI text
  menu: 'Menu', // UI text, menu toggle when closed
  close: 'Close', // UI text, menu toggle when open
  notFoundHeading: 'Page not found.', // UI text
  notFoundLink: 'Return to the site', // UI text
} as const;

// Meta descriptions. Only the splash description was supplied by the
// document. Each inner page uses the first sentence of its own approved
// copy, word for word, as a stand-in.
// TODO(copy): supply dedicated meta descriptions per page if wanted.
export const meta = {
  mission: 'Most students never encounter biomedical engineering until college, if they encounter it at all. Young Medical Engineers, a nonprofit founded and run by high school students, exists to change that.',
  about: 'Young Medical Engineers is a nonprofit founded and run by high school students. Our mission is to introduce more students to biomedical engineering, a field most people never hear about until college.',
  programs: 'Our programs serve two purposes: introducing students to biomedical engineering, and supporting those who decide to pursue it.',
  tutoring: 'Tell us what you are working on, and we will match you with a volunteer tutor: an undergraduate or graduate student in biomedical engineering. The service is free, held online, and scheduled around your availability.',
  volunteer: 'If you study or work in biomedical or medical engineering, or teach the sciences that lead into it, we would welcome your involvement.',
  donate: 'Young Medical Engineers runs on donations and volunteer time, and every program we offer is free to students.',
  contact: 'Whether you are a student, parent, teacher, or professional in the field, we would be glad to hear from you.',
  board: 'Ten people, one conviction: every curious student deserves a way into this field.',
  impact: 'Young Medical Engineers launched in 2026. We would rather report accurate figures than inflated ones, so this page will grow as we host events and work with more students.',
} as const;
