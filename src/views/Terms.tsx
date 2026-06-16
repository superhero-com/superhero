/* eslint-disable max-len, react/no-unescaped-entities */
import React from 'react';
import { useTranslation } from 'react-i18next';
import { AeButton } from '@/components/ui/ae-button';
import { useNavigate } from 'react-router-dom';
import FooterSection from '../components/layout/FooterSection';

const Terms = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  return (
    <>
      <div className="max-w-[980px] mx-auto p-4">
        <div className="mb-4">
          <AeButton
            onClick={() => {
              if (window.history.length > 1) {
                navigate(-1);
              } else {
                navigate('/');
              }
            }}
            variant="ghost"
            size="sm"
            outlined
            className="!border !border-solid !border-white/15 hover:!border-white/35"
          >
            ← {t('common.labels.back')}
          </AeButton>
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">{t('common.views.terms.title')}</h2>
        <p className="text-white/70 mb-6">{t('common.views.terms.lastUpdated')}</p>

        <h3 className="text-xl font-semibold text-white mb-2">{t('common.views.terms.section1Title')}</h3>
        <p className="text-white/80 mb-4 leading-relaxed">
          {t('common.views.terms.section1Para1')}
        </p>
        <p className="text-white/80 mb-4 leading-relaxed">
          {t('common.views.terms.section1Para2')}
        </p>
        <p className="text-white/80 mb-4 leading-relaxed">
          {t('common.views.terms.section1Para3')}
        </p>

        <h3 className="text-xl font-semibold text-white mb-2">{t('common.views.terms.section2Title')}</h3>
        <p className="text-white/80 mb-4 leading-relaxed">
          {t('common.views.terms.section2Para1')}
        </p>
        <p className="text-white/80 mb-4 leading-relaxed">
          {t('common.views.terms.section2Para2')}
        </p>

        <h3 className="text-xl font-semibold text-white mb-2">{t('common.views.terms.section3Title')}</h3>
        <p className="text-white/80 mb-4 leading-relaxed">
          {t('common.views.terms.section3Para1')}
        </p>

        <h3 className="text-xl font-semibold text-white mb-2">{t('common.views.terms.section4Title')}</h3>
        <p className="text-white/80 mb-4 leading-relaxed">
          {t('common.views.terms.section4Para1')}
        </p>

        <h3 className="text-xl font-semibold text-white mb-2">{t('common.views.terms.section5Title')}</h3>
        <p className="text-white/80 mb-4 leading-relaxed">
          {t('common.views.terms.section5Para1')}
        </p>

        <h3 className="text-xl font-semibold text-white mb-2">{t('common.views.terms.section6Title')}</h3>
        <p className="text-white/80 mb-4 leading-relaxed">
          {t('common.views.terms.section6Intro')}
        </p>
        <ol className="list-decimal pl-6 text-white/80 mb-4 leading-relaxed space-y-2">
          <li>
            <span className="font-semibold">{t('common.views.terms.section6Item1Title')}</span>
            <ul className="list-disc pl-5 mt-1 space-y-1">
              <li>{t('common.views.terms.section6Item1Bullet1')}</li>
              <li>{t('common.views.terms.section6Item1Bullet2')}</li>
            </ul>
          </li>
          <li>
            <span className="font-semibold">{t('common.views.terms.section6Item2Title')}</span>
            <ul className="list-disc pl-5 mt-1 space-y-1">
              <li>{t('common.views.terms.section6Item2Bullet1')}</li>
              <li>{t('common.views.terms.section6Item2Bullet2')}</li>
            </ul>
          </li>
          <li>
            <span className="font-semibold">{t('common.views.terms.section6Item3Title')}</span>
            <ul className="list-disc pl-5 mt-1 space-y-1">
              <li>{t('common.views.terms.section6Item3Bullet1')}</li>
            </ul>
          </li>
          <li>
            <span className="font-semibold">{t('common.views.terms.section6Item4Title')}</span>
            <ul className="list-disc pl-5 mt-1 space-y-1">
              <li>{t('common.views.terms.section6Item4Bullet1')}</li>
              <li>{t('common.views.terms.section6Item4Bullet2')}</li>
            </ul>
          </li>
        </ol>
        <p className="text-white/80 mb-4 leading-relaxed">
          {t('common.views.terms.section6Para2')}
        </p>

        <h3 className="text-xl font-semibold text-white mb-2">{t('common.views.terms.section7Title')}</h3>
        <p className="text-white/80 mb-4 leading-relaxed">
          {t('common.views.terms.section7Para1')}
        </p>

        <p className="text-white/80 mb-4 leading-relaxed">
          {t('common.views.terms.copyrightNotice')}
        </p>
      </div>
      <div className="mt-8">
        <FooterSection />
      </div>
    </>
  );
};

export default Terms;
