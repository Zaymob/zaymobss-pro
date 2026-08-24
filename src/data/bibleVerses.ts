export interface BibleVerse {
  id: string;
  reference: string;
  text: string;
  translation?: string;
  theme?: string;
}

export const BIBLE_VERSES: BibleVerse[] = [
  {
    id: 'phil-4-13',
    reference: 'Philippians 4:13',
    text: 'I can do all this through him who gives me strength.',
    translation: 'NIV',
    theme: 'Strength',
  },
  {
    id: 'jer-29-11',
    reference: 'Jeremiah 29:11',
    text: '"For I know the plans I have for you," declares the LORD, "plans to prosper you and not to harm you, plans to give you hope and a future."',
    translation: 'NIV',
    theme: 'Hope',
  },
  {
    id: 'prov-3-5-6',
    reference: 'Proverbs 3:5-6',
    text: 'Trust in the LORD with all your heart and lean not on your own understanding; in all your ways submit to him, and he will make your paths straight.',
    translation: 'NIV',
    theme: 'Trust',
  },
  {
    id: 'isa-41-10',
    reference: 'Isaiah 41:10',
    text: 'So do not fear, for I am with you; do not be dismayed, for I am your God. I will strengthen you and help you; I will uphold you with my righteous right hand.',
    translation: 'NIV',
    theme: 'Comfort',
  },
  {
    id: 'rom-8-28',
    reference: 'Romans 8:28',
    text: 'And we know that in all things God works for the good of those who love him, who have been called according to his purpose.',
    translation: 'NIV',
    theme: 'Faith',
  },
  {
    id: 'ps-23-1',
    reference: 'Psalm 23:1-3',
    text: 'The LORD is my shepherd, I lack nothing. He makes me lie down in green pastures, he leads me beside quiet waters, he refreshes my soul.',
    translation: 'NIV',
    theme: 'Peace',
  },
  {
    id: 'ps-46-1',
    reference: 'Psalm 46:1',
    text: 'God is our refuge and strength, an ever-present help in trouble.',
    translation: 'NIV',
    theme: 'Refuge',
  },
  {
    id: 'josh-1-9',
    reference: 'Joshua 1:9',
    text: 'Have I not commanded you? Be strong and courageous. Do not be afraid; do not be discouraged, for the LORD your God will be with you wherever you go.',
    translation: 'NIV',
    theme: 'Courage',
  },
  {
    id: 'matt-11-28',
    reference: 'Matthew 11:28',
    text: '"Come to me, all you who are weary and burdened, and I will give you rest."',
    translation: 'NIV',
    theme: 'Rest',
  },
  {
    id: '2tim-1-7',
    reference: '2 Timothy 1:7',
    text: 'For the Spirit God gave us does not make us timid, but gives us power, love and self-discipline.',
    translation: 'NIV',
    theme: 'Power',
  },
  {
    id: 'john-3-16',
    reference: 'John 3:16',
    text: 'For God so loved the world that he gave his one and only Son, that whoever believes in him shall not perish but have eternal life.',
    translation: 'NIV',
    theme: 'Salvation',
  },
  {
    id: 'ps-119-105',
    reference: 'Psalm 119:105',
    text: 'Your word is a lamp for my feet, a light on my path.',
    translation: 'NIV',
    theme: 'Guidance',
  },
  {
    id: '1cor-13-4-7',
    reference: '1 Corinthians 13:4-7',
    text: 'Love is patient, love is kind. It does not envy, it does not boast, it is not proud. It does not dishonor others, it is not self-seeking, it is not easily angered, it keeps no record of wrongs.',
    translation: 'NIV',
    theme: 'Love',
  },
  {
    id: 'col-3-23',
    reference: 'Colossians 3:23',
    text: 'Whatever you do, work at it with all your heart, as working for the Lord, not for human masters.',
    translation: 'NIV',
    theme: 'Diligence',
  },
  {
    id: 'gal-5-22-23',
    reference: 'Galatians 5:22-23',
    text: 'But the fruit of the Spirit is love, joy, peace, forbearance, kindness, goodness, faithfulness, gentleness and self-control.',
    translation: 'NIV',
    theme: 'Fruit of the Spirit',
  },
  {
    id: 'micah-6-8',
    reference: 'Micah 6:8',
    text: 'He has shown you, O mortal, what is good. And what does the LORD require of you? To act justly and to love mercy and to walk humbly with your God.',
    translation: 'NIV',
    theme: 'Humility',
  },
  {
    id: 'heb-11-1',
    reference: 'Hebrews 11:1',
    text: 'Now faith is confidence in what we hope for and assurance about what we do not see.',
    translation: 'NIV',
    theme: 'Faith',
  },
  {
    id: '1pet-5-7',
    reference: '1 Peter 5:7',
    text: 'Cast all your anxiety on him because he cares for you.',
    translation: 'NIV',
    theme: 'Peace',
  },
  {
    id: 'ps-91-1-2',
    reference: 'Psalm 91:1-2',
    text: 'Whoever dwells in the shelter of the Most High will rest in the shadow of the Almighty. I will say of the LORD, "He is my refuge and my fortress, my God, in whom I trust."',
    translation: 'NIV',
    theme: 'Protection',
  },
  {
    id: 'eph-2-8-9',
    reference: 'Ephesians 2:8-9',
    text: 'For it is by grace you have been saved, through faith—and this is not from yourselves, it is the gift of God—not by works, so that no one can boast.',
    translation: 'NIV',
    theme: 'Grace',
  },
  {
    id: 'ps-139-14',
    reference: 'Psalm 139:14',
    text: 'I praise you because I am fearfully and wonderfully made; your works are wonderful, I know that full well.',
    translation: 'NIV',
    theme: 'Praise',
  },
  {
    id: 'matt-6-33',
    reference: 'Matthew 6:33',
    text: 'But seek first his kingdom and his righteousness, and all these things will be given to you as well.',
    translation: 'NIV',
    theme: 'Priorities',
  }
];

export function getRandomBibleVerse(): BibleVerse {
  const index = Math.floor(Math.random() * BIBLE_VERSES.length);
  return BIBLE_VERSES[index];
}
