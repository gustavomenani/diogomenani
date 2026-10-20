import { describe, expect, test } from 'vitest';
import { confirmedProfiles, legalService } from './structured-data';

describe('legalService', () => {
  test('é um LegalService do schema.org', () => {
    expect(legalService(undefined)).toMatchObject({
      '@context': 'https://schema.org',
      '@type': 'LegalService',
    });
  });

  test('o telefone sai no formato internacional', () => {
    expect(legalService(undefined)).toHaveProperty('telephone', '+55 18 99701-7249');
  });

  test('knowsAbout lista as 6 áreas de atuação', () => {
    expect(legalService(undefined)).toHaveProperty('knowsAbout', [
      'Família e Sucessões',
      'Direito do Consumidor',
      'Contratos e Direito Civil',
      'Direito do Trabalho',
      'Direito Imobiliário',
      'Assessoria para Empresas',
    ]);
  });

  test('sameAs traz os dois perfis do Instagram', () => {
    expect(legalService(undefined)).toHaveProperty(
      'sameAs',
      expect.arrayContaining([
        'https://www.instagram.com/menani.advocacia/',
        'https://www.instagram.com/diogomenani/',
      ]),
    );
  });

  test('sameAs deixa de fora o perfil ainda a confirmar', () => {
    expect(legalService(undefined)).not.toHaveProperty(
      'sameAs',
      expect.arrayContaining(['https://linkedin.com/']),
    );
  });

  test('sem o endereço do site, não há url nem image', () => {
    const data = legalService(undefined);
    expect(data).not.toHaveProperty('url');
    expect(data).not.toHaveProperty('image');
  });

  test('com o endereço do site, url e image saem absolutas', () => {
    expect(legalService(new URL('https://exemplo.adv.br'))).toMatchObject({
      url: 'https://exemplo.adv.br/',
      image: 'https://exemplo.adv.br/og.png',
    });
  });
});

describe('confirmedProfiles', () => {
  test('o perfil com link provisório fica de fora, e o preenchido entra', () => {
    expect(
      confirmedProfiles([
        { label: 'LinkedIn [perfil]', href: 'https://linkedin.com/', icon: 'linkedin' },
        { label: 'Fulano', href: 'https://www.linkedin.com/in/fulano', icon: 'linkedin' },
      ]),
    ).toEqual(['https://www.linkedin.com/in/fulano']);
  });
});
