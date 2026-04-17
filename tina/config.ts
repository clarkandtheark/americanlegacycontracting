import { defineConfig } from 'tinacms';
import { mountDeployStatusWidget } from './deploy-status';

const branch =
  process.env.GITHUB_BRANCH ||
  process.env.HEAD ||
  'main';

export default defineConfig({
  branch,
  clientId: process.env.TINA_CLIENT_ID!,
  token: process.env.TINA_TOKEN!,
  build: {
    outputFolder: 'admin',
    publicFolder: 'public',
  },
  cmsCallback: (cms) => {
    mountDeployStatusWidget();
    return cms;
  },
  ui: {},
  media: {
    tina: {
      mediaRoot: 'assets/img/portfolio',
      publicFolder: 'public',
    },
  },
  schema: {
    collections: [
      {
        name: 'siteSettings',
        label: 'Site Settings',
        path: 'src/content',
        format: 'json',
        match: { include: 'site' },
        ui: {
          allowedActions: { create: false, delete: false },
          filename: { readonly: true },
        },
        fields: [
          {
            type: 'string',
            name: 'hero_tagline',
            label: 'Hero Tagline',
            ui: { component: 'textarea' },
            description: 'The paragraph shown on the homepage hero banner',
          },
          {
            type: 'string',
            name: 'about_text',
            label: 'About Text',
            ui: { component: 'textarea' },
            description: 'The paragraph in the About/Owner section',
          },
          { type: 'string', name: 'phone', label: 'Phone Number' },
          { type: 'string', name: 'email', label: 'Email Address' },
          {
            type: 'string',
            name: 'reviews_url',
            label: 'Reviews URL',
            description: 'Link for the All Reviews button',
          },
          {
            type: 'string',
            name: 'contact_form_url',
            label: 'Contact Form URL',
            description: 'Google Form embed URL',
          },
        ],
      },
      {
        name: 'services',
        label: 'Services',
        path: 'src/content/services',
        format: 'json',
        defaultItem: () => ({ order: 99 }),
        fields: [
          {
            type: 'number',
            name: 'order',
            label: 'Order',
            description: 'Display order (1 = first)',
            required: true,
          },
          { type: 'string', name: 'title', label: 'Title', required: true, isTitle: true },
          {
            type: 'string',
            name: 'description',
            label: 'Description',
            ui: { component: 'textarea' },
            required: true,
          },
          {
            type: 'string',
            name: 'icon',
            label: 'Icon',
            description: 'FontAwesome icon name, e.g. fa-hammer',
          },
        ],
      },
      {
        name: 'testimonials',
        label: 'Testimonials',
        path: 'src/content/testimonials',
        format: 'json',
        defaultItem: () => ({ order: 99 }),
        fields: [
          {
            type: 'number',
            name: 'order',
            label: 'Order',
            description: 'Display order (1 = first)',
            required: true,
          },
          {
            type: 'string',
            name: 'quote',
            label: 'Quote',
            ui: { component: 'textarea' },
            required: true,
          },
          {
            type: 'string',
            name: 'author',
            label: 'Author',
            description: 'e.g. Chris D.',
            required: true,
            isTitle: true,
          },
          {
            type: 'string',
            name: 'date',
            label: 'Date',
            description: 'Optional. Format: YYYY-MM-DD',
          },
        ],
      },
      {
        name: 'portfolio',
        label: 'Portfolio Projects',
        path: 'src/content/portfolio',
        format: 'json',
        defaultItem: () => ({ order: 99 }),
        fields: [
          {
            type: 'number',
            name: 'order',
            label: 'Order',
            description: 'Display order (1 = first)',
            required: true,
          },
          {
            type: 'string',
            name: 'category',
            label: 'Category',
            description: 'e.g. Bathroom Finish, Basement Finish, New Build',
            required: true,
            isTitle: true,
          },
          {
            type: 'image',
            name: 'image',
            label: 'Main Image (After)',
            description: 'The image shown in the grid',
            required: true,
          },
          {
            type: 'image',
            name: 'lightbox_image',
            label: 'Lightbox Image',
            description: 'Image shown when clicked (use a Before photo if you have one)',
          },
          { type: 'string', name: 'lightbox_title', label: 'Lightbox Title' },
          {
            type: 'string',
            name: 'caption',
            label: 'Caption',
            description: 'e.g. Click to Enlarge',
          },
          {
            type: 'string',
            name: 'alt_text',
            label: 'Alt Text',
            ui: { component: 'textarea' },
            description: 'Describe the image for screen readers and SEO',
          },
        ],
      },
    ],
  },
});
