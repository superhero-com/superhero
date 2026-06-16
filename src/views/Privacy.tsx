/* eslint-disable max-len, react/no-unescaped-entities */
import React from 'react';
import { useTranslation } from 'react-i18next';
import { AeButton } from '@/components/ui/ae-button';
import { useNavigate } from 'react-router-dom';
import FooterSection from '../components/layout/FooterSection';

const Privacy = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
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
            ←
            {' '}
            {t('common.labels.back')}
          </AeButton>
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">{t('common.views.privacy.title')}</h2>
        <p className="text-white/70 mb-6">{t('common.views.privacy.lastUpdated')}</p>

        <h3 className="text-xl font-semibold text-white mb-2">{t('common.views.privacy.introHeading')}</h3>
        <p className="text-white/80 mb-4 leading-relaxed">
          {t('common.views.privacy.introP1')}
        </p>
        <p className="text-white/80 mb-4 leading-relaxed">
          {t('common.views.privacy.introP2')}
        </p>
        <p className="text-white/80 mb-4 leading-relaxed">
          {t('common.views.privacy.introP3')}
        </p>

        <h3 className="text-xl font-semibold text-white mb-2">{t('common.views.privacy.definitionsHeading')}</h3>
        <ul className="text-white/80 mb-4 leading-relaxed list-disc pl-6">
          <li>
            <span className="font-semibold">Data Controller</span>
            {' '}
            means the person or body which, alone or jointly
            with others, determines the purposes and means of the processing of personal data.
          </li>
          <li>
            <span className="font-semibold">Personal Data</span>
            {' '}
            means any information relating to an identified or
            identifiable natural person (USER).
          </li>
          <li>
            <span className="font-semibold">Processing</span>
            {' '}
            means any operation or set of operations which is
            performed on personal data.
          </li>
          <li>
            <span className="font-semibold">Recipient</span>
            {' '}
            means a natural or legal person, public authority, agency
            or another body, to which the personal data are disclosed, whether a third party or not.
          </li>
          <li>
            <span className="font-semibold">Personal data breach</span>
            {' '}
            means a breach of security leading to the
            accidental or unlawful destruction, loss, alteration, unauthorized disclosure of, or access to, personal data
            transmitted, stored or otherwise processed.
          </li>
        </ul>

        <h3 className="text-xl font-semibold text-white mb-2">{t('common.views.privacy.collectionHeading')}</h3>
        <p className="text-white/80 mb-2 leading-relaxed">
          {t('common.views.privacy.collectionIntro')}
        </p>
        <ul className="text-white/80 mb-4 leading-relaxed list-disc pl-6">
          <li>{t('common.views.privacy.collectionLi1')}</li>
          <li>
            {t('common.views.privacy.collectionLi2')}
          </li>
          <li>
            {t('common.views.privacy.collectionLi3')}
          </li>
        </ul>

        <h3 className="text-xl font-semibold text-white mb-2">{t('common.views.privacy.implicationsHeading')}</h3>
        <ul className="text-white/80 mb-4 leading-relaxed list-disc pl-6">
          <li>
            {t('common.views.privacy.implicationsLi1')}
          </li>
          <li>
            {t('common.views.privacy.implicationsLi2')}
          </li>
          <li>
            {t('common.views.privacy.implicationsLi3')}
          </li>
        </ul>

        <h3 className="text-xl font-semibold text-white mb-2">{t('common.views.privacy.supportHeading')}</h3>
        <p className="text-white/80 mb-4 leading-relaxed">
          {t('common.views.privacy.supportP1')}
        </p>

        <h3 className="text-xl font-semibold text-white mb-2">{t('common.views.privacy.rightsHeading')}</h3>
        <p className="text-white/80 mb-2 leading-relaxed">
          {t('common.views.privacy.rightsIntro')}
        </p>
        <ul className="text-white/80 mb-4 leading-relaxed list-disc pl-6">
          <li>{t('common.views.privacy.rightsLi1')}</li>
          <li>
            {t('common.views.privacy.rightsLi2')}
          </li>
          <li>{t('common.views.privacy.rightsLi3')}</li>
          <li>
            {t('common.views.privacy.rightsLi4')}
          </li>
          <li>
            {t('common.views.privacy.rightsLi5')}
          </li>
          <li>{t('common.views.privacy.rightsLi6')}</li>
          <li>
            {t('common.views.privacy.rightsLi7')}
          </li>
        </ul>

        <h3 className="text-xl font-semibold text-white mb-2">{t('common.views.privacy.sharingHeading')}</h3>
        <p className="text-white/80 mb-4 leading-relaxed">
          {t('common.views.privacy.sharingP1')}
        </p>

        <h3 className="text-xl font-semibold text-white mb-2">{t('common.views.privacy.childrenHeading')}</h3>
        <p className="text-white/80 mb-4 leading-relaxed">
          {t('common.views.privacy.childrenP1')}
        </p>

        <h3 className="text-xl font-semibold text-white mb-2">{t('common.views.privacy.breachHeading')}</h3>
        <p className="text-white/80 mb-4 leading-relaxed">
          {t('common.views.privacy.breachP1')}
        </p>

        <h3 className="text-xl font-semibold text-white mb-2">{t('common.views.privacy.contactHeading')}</h3>
        <p className="text-white/80 leading-relaxed">
          {t('common.views.privacy.contactP1')}
        </p>
      </div>
      <div className="mt-8">
        <FooterSection />
      </div>
    </>
  );
};

export default Privacy;
