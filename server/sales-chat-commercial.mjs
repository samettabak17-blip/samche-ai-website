import { plans, productModules } from '../lib/site-data.mjs';

export const commercialFacts = {
  plans: plans.map(({ slug, name, monthly, setup, yearly, interactions, features, from }) => ({ slug, name, monthly, setup, yearly, interactions, features, from })),
  products: productModules.filter((product) => product.name !== 'Dashboard & Tenant Analytics').map(({ name, status }) => ({ name, status })),
};
