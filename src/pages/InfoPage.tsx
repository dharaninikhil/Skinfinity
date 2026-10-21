// src/pages/InfoPage.tsx
//
// Static customer-care pages. The footer and navbar linked to terms, privacy,
// help, shipping, returns and contact, but none of those routes existed — every
// one of them rendered a blank screen.
import { type ReactNode } from 'react';
import { Mail, MapPin, MessageCircle, Phone } from 'lucide-react';
import { useNavigate } from '../hooks/useRoute';
import { INFO_PAGES, type InfoSlug } from '../lib/router';

type Section = { heading: string; body: string[] };

type InfoContent = {
  title: string;
  intro: string;
  updated: string;
  sections: Section[];
};

const LABELS: Record<InfoSlug, string> = {
  help: 'Help & FAQs',
  shipping: 'Shipping',
  returns: 'Returns & refunds',
  contact: 'Contact us',
  terms: 'Terms of service',
  privacy: 'Privacy policy',
};

const CONTENT: Record<InfoSlug, InfoContent> = {
  help: {
    title: 'Help & FAQs',
    intro: 'Answers to the questions we hear most often. Still stuck? Contact us any time.',
    updated: 'October 2025',
    sections: [
      {
        heading: 'Are the products authentic?',
        body: [
          'Yes. Every product is sourced directly from the brand or an authorised Korean distributor, and we keep import documentation for each batch. If you ever doubt an item, contact us with your order number and we will share its provenance.',
        ],
      },
      {
        heading: 'How do I build a routine?',
        body: [
          'Start with the basics: a gentle cleanser, a hydrating toner, a treatment serum for your main concern, a moisturiser, and sunscreen every morning. Add actives one at a time and give each two to four weeks before judging results.',
          'Use “Shop by skin concern” to find formulas targeted at what your skin is doing right now, and set your skin type in your profile so recommendations stay relevant.',
        ],
      },
      {
        heading: 'Can I change or cancel an order?',
        body: [
          'Orders can be changed or cancelled free of charge until they are dispatched. Once an order is marked as shipped, use the returns process instead.',
        ],
      },
      {
        heading: 'Do you offer samples?',
        body: [
          'Where stock allows we include sachet samples with each order. Samples are complimentary and cannot be purchased separately.',
        ],
      },
    ],
  },
  shipping: {
    title: 'Shipping',
    intro: 'We ship across India from our fulfilment centre in Hyderabad.',
    updated: 'October 2025',
    sections: [
      {
        heading: 'Delivery times',
        body: [
          'Metro cities: 2–4 business days. Rest of India: 4–7 business days. Orders placed before 2pm IST on a business day are dispatched the same day.',
        ],
      },
      {
        heading: 'Shipping charges',
        body: [
          'Shipping is free on orders of ₹1,499 or more. Below that a flat fee of ₹99 applies, shown in the cart and at checkout before you pay.',
        ],
      },
      {
        heading: 'Tracking',
        body: [
          'A tracking link is emailed as soon as your order is dispatched, and the same status is available under Your profile → Orders.',
        ],
      },
    ],
  },
  returns: {
    title: 'Returns & refunds',
    intro: 'Seven days, unused and unopened, no awkward questions.',
    updated: 'October 2025',
    sections: [
      {
        heading: 'Eligibility',
        body: [
          'Unopened products can be returned within 7 days of delivery for a full refund. For hygiene reasons we cannot resell opened skincare, so opened items are only accepted when faulty or incorrectly supplied.',
        ],
      },
      {
        heading: 'Damaged or wrong items',
        body: [
          'Contact us within 48 hours of delivery with your order number and a photo of the item and packaging. We will arrange a replacement or a full refund, and cover return shipping.',
        ],
      },
      {
        heading: 'Refund timing',
        body: [
          'Refunds are issued to the original payment method within 5–7 business days of the return reaching us. Cash-on-delivery orders are refunded to the bank account you share with our support team.',
        ],
      },
    ],
  },
  contact: {
    title: 'Contact us',
    intro: 'Real people, usually answering within one business day.',
    updated: 'October 2025',
    sections: [
      {
        heading: 'Support',
        body: [
          'Email hello@skinfinity.example for anything order-related. Include your order number so we can pull it up straight away.',
          'Phone and WhatsApp support is available Monday to Saturday, 10am–7pm IST.',
        ],
      },
      {
        heading: 'Where we are',
        body: ['Skinfinity Retail Pvt Ltd, Banjara Hills, Hyderabad, Telangana, India.'],
      },
    ],
  },
  terms: {
    title: 'Terms of service',
    intro:
      'These terms govern your use of the Skinfinity storefront. This is a starter template — have a lawyer review before you trade.',
    updated: 'October 2025',
    sections: [
      {
        heading: '1. Using the store',
        body: [
          'You agree to use Skinfinity only for lawful purposes and not to attempt to disrupt the service, scrape the catalogue, or resell access to your account.',
        ],
      },
      {
        heading: '2. Products and pricing',
        body: [
          'Prices are listed in Indian Rupees and include applicable taxes unless stated otherwise. We try hard to keep stock and pricing accurate, but we may cancel an order if an item is mispriced or unavailable, and we will refund you in full if you have already paid.',
        ],
      },
      {
        heading: '3. Orders',
        body: [
          'An order is accepted when we dispatch it. Until then we may decline it for any reason, including stock availability or suspected fraud.',
        ],
      },
      {
        heading: '4. Not medical advice',
        body: [
          'Skincare content on this site is informational and is not medical advice. Patch-test new products and consult a dermatologist for persistent skin conditions.',
        ],
      },
      {
        heading: '5. Liability',
        body: [
          'Our liability for any order is limited to the amount you paid for it, except where the law says otherwise.',
        ],
      },
    ],
  },
  privacy: {
    title: 'Privacy policy',
    intro:
      'What we collect, why we collect it, and how to get it removed. This is a starter template — have a lawyer review before you trade.',
    updated: 'October 2025',
    sections: [
      {
        heading: 'What we collect',
        body: [
          'Account details (name, email, skin type), order and delivery information, and the contents of your cart and wishlist. Guest carts are stored in your browser only.',
        ],
      },
      {
        heading: 'Why we collect it',
        body: [
          'To fulfil orders, to personalise product recommendations based on your skin type, and to send the newsletter if you subscribe. We do not sell your personal data.',
        ],
      },
      {
        heading: 'Where it is stored',
        body: [
          'Personal data is held in a Supabase (Postgres) database with row-level security, so a shopper can only read their own profile, cart, wishlist and orders.',
        ],
      },
      {
        heading: 'Your choices',
        body: [
          'You can update or delete your profile at any time from Your profile, unsubscribe from marketing emails using the link in each email, or email us to request a full export or deletion of your data.',
        ],
      },
    ],
  },
};

export default function InfoPage({ slug }: { slug: string }) {
  const navigate = useNavigate();

  const key = (INFO_PAGES as readonly string[]).includes(slug) ? (slug as InfoSlug) : 'help';
  const content = CONTENT[key];

  return (
    <div className="bg-white">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[220px_1fr]">
          <nav aria-label="Customer care" className="lg:sticky lg:top-28 lg:self-start">
            <ul className="flex gap-2 overflow-x-auto pb-2 lg:flex-col lg:gap-1 lg:overflow-visible lg:pb-0">
              {INFO_PAGES.map((page) => (
                <li key={page} className="shrink-0">
                  <button
                    type="button"
                    onClick={() => navigate(`info-${page}`)}
                    aria-current={page === key ? 'page' : undefined}
                    className={`w-full whitespace-nowrap rounded-xl px-3 py-2 text-left text-sm transition ${
                      page === key
                        ? 'bg-rose-50 font-semibold text-rose-700'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {LABELS[page]}
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          <article className="max-w-3xl">
            <h1 className="text-3xl font-bold text-gray-900 sm:text-4xl">{content.title}</h1>
            <p className="mt-3 text-gray-600">{content.intro}</p>
            <p className="mt-2 text-xs uppercase tracking-wide text-gray-400">Last updated {content.updated}</p>

            <div className="mt-8 space-y-8">
              {content.sections.map((section) => (
                <section key={section.heading}>
                  <h2 className="text-lg font-semibold text-gray-900">{section.heading}</h2>
                  {section.body.map((paragraph) => (
                    <p key={paragraph.slice(0, 32)} className="mt-2 leading-relaxed text-gray-600">
                      {paragraph}
                    </p>
                  ))}
                </section>
              ))}
            </div>

            {key === 'contact' && <ContactCards />}
          </article>
        </div>
      </div>
    </div>
  );
}

function ContactCards() {
  const cards: Array<{ icon: ReactNode; label: string; value: string; href?: string }> = [
    { icon: <Mail className="h-5 w-5" />, label: 'Email', value: 'hello@skinfinity.example', href: 'mailto:hello@skinfinity.example' },
    { icon: <Phone className="h-5 w-5" />, label: 'Phone', value: '+91 40 0000 0000', href: 'tel:+914000000000' },
    { icon: <MessageCircle className="h-5 w-5" />, label: 'WhatsApp', value: '+91 90000 00000' },
    { icon: <MapPin className="h-5 w-5" />, label: 'Address', value: 'Banjara Hills, Hyderabad, Telangana' },
  ];

  return (
    <div className="mt-10 grid gap-4 sm:grid-cols-2">
      {cards.map((card) => {
        const inner = (
          <>
            <span className="rounded-full bg-rose-50 p-2 text-rose-600">{card.icon}</span>
            <span>
              <span className="block text-xs uppercase tracking-wide text-gray-400">{card.label}</span>
              <span className="block text-sm font-medium text-gray-900">{card.value}</span>
            </span>
          </>
        );

        return card.href ? (
          <a
            key={card.label}
            href={card.href}
            className="flex items-center gap-3 rounded-2xl border border-gray-100 p-4 transition hover:border-rose-200 hover:bg-rose-50/40"
          >
            {inner}
          </a>
        ) : (
          <div key={card.label} className="flex items-center gap-3 rounded-2xl border border-gray-100 p-4">
            {inner}
          </div>
        );
      })}
    </div>
  );
}
