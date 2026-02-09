/* eslint-disable
  react/function-component-definition,
  no-use-before-define,
  react/no-unescaped-entities,
  react/button-has-type,
  max-len
*/
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

type QuestionDef = {
  id: string;
  categoryKey: string;
  titleKey: string;
  answerKey?: string;
  listKeys?: string[];
};

const QUESTION_DEFS: QuestionDef[] = [
  { id: 'what-is-superhero', categoryKey: 'categoryOverview', titleKey: 'qWhatIsSuperheroTitle', answerKey: 'qWhatIsSuperheroAnswer' },
  { id: 'chat-powered-by-quali', categoryKey: 'categoryChatCommunity', titleKey: 'qChatPoweredByQualiTitle', answerKey: 'qChatPoweredByQualiAnswer' },
  { id: 'what-is-trending', categoryKey: 'categoryOverview', titleKey: 'qWhatIsTrendingTitle', answerKey: 'qWhatIsTrendingAnswer' },
  { id: 'quick-start', categoryKey: 'categoryGettingStarted', titleKey: 'qQuickStartTitle', listKeys: ['qQuickStartLi1', 'qQuickStartLi2', 'qQuickStartLi3', 'qQuickStartLi4'] },
  { id: 'buy-sell', categoryKey: 'categoryTrading', titleKey: 'qBuySellTitle', answerKey: 'qBuySellAnswer' },
  { id: 'fees', categoryKey: 'categoryTrading', titleKey: 'qFeesTitle', answerKey: 'qFeesAnswer' },
  { id: 'holders-vs-tx', categoryKey: 'categoryTrading', titleKey: 'qHoldersVsTxTitle', answerKey: 'qHoldersVsTxAnswer' },
  { id: 'dao', categoryKey: 'categoryDaoGovernance', titleKey: 'qDaoTitle', answerKey: 'qDaoAnswer' },
  { id: 'governance', categoryKey: 'categoryDaoGovernance', titleKey: 'qGovernanceTitle', answerKey: 'qGovernanceAnswer' },
  { id: 'social', categoryKey: 'categorySocialFeed', titleKey: 'qSocialTitle', answerKey: 'qSocialAnswer' },
  { id: 'accounts', categoryKey: 'categoryAccountsRankings', titleKey: 'qAccountsTitle', answerKey: 'qAccountsAnswer' },
  { id: 'invites', categoryKey: 'categoryInvitesRewards', titleKey: 'qInvitesTitle', answerKey: 'qInvitesAnswer' },
  { id: 'analytics', categoryKey: 'categoryPricingAnalytics', titleKey: 'qAnalyticsTitle', answerKey: 'qAnalyticsAnswer' },
  { id: 'wallet', categoryKey: 'categoryWalletSecurity', titleKey: 'qWalletTitle', answerKey: 'qWalletAnswer' },
  { id: 'risks', categoryKey: 'categoryWalletSecurity', titleKey: 'qRisksTitle', answerKey: 'qRisksAnswer' },
  { id: 'help', categoryKey: 'categorySupport', titleKey: 'qHelpTitle', answerKey: 'qHelpAnswer' },
  { id: 'glossary', categoryKey: 'categoryGlossary', titleKey: 'qGlossaryTitle', listKeys: ['qGlossaryLi1', 'qGlossaryLi2', 'qGlossaryLi3', 'qGlossaryLi4'] },
];

const CATEGORY_ORDER = ['categoryOverview', 'categoryChatCommunity', 'categoryGettingStarted', 'categoryTrading', 'categoryDaoGovernance', 'categorySocialFeed', 'categoryAccountsRankings', 'categoryInvitesRewards', 'categoryPricingAnalytics', 'categoryWalletSecurity', 'categorySupport', 'categoryGlossary'];

export default function FAQ() {
  const { t } = useTranslation('faq');
  const questions = useMemo(() => QUESTION_DEFS.map((q) => {
    const title = t(q.titleKey);
    const answer: React.ReactNode = q.listKeys
      ? (
          <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.8 }}>
            {q.listKeys.map((key) => (
              <li key={key}>{t(key)}</li>
            ))}
          </ul>
        )
      : t(q.answerKey!);
    return { id: q.id, title, answer, categoryKey: q.categoryKey };
  }), [t]);
  const categories = useMemo(
    () => CATEGORY_ORDER.filter((key) => questions.some((q) => q.categoryKey === key)),
    [questions],
  );

  return (
    <div className="max-w-[1000px] mx-auto p-6 text-white">
      <div className="rounded-2xl p-7 bg-gradient-to-b from-white/6 to-white/3 text-white mb-4 border border-white/10 backdrop-blur-md">
        <div className="text-sm opacity-90">{t('welcome')}</div>
        <div className="text-[32px] font-extrabold leading-tight">{t('heroTitle')}</div>
        <div className="text-[15px] opacity-90 mt-2">{t('heroDescription')}</div>
        <div className="flex gap-2.5 mt-3.5 flex-wrap">
          <Badge label={t('badgeCreate')} />
          <Badge label={t('badgeTrade')} />
          <Badge label={t('badgeVote')} />
          <Badge label={t('badgeEarn')} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[260px_1fr]">
        <Card>
          <div className="font-extrabold mb-2">{t('onThisPage')}</div>
          <div className="grid gap-1.5">
            {categories.map((catKey) => (
              <a key={catKey} href={`#${catKey}`} className="no-underline text-white text-sm opacity-90 hover:opacity-100 transition-opacity">
                {t(catKey)}
              </a>
            ))}
          </div>
          <div className="mt-4 text-xs opacity-75">{t('tip')}</div>
        </Card>

        <div className="grid gap-4">
          <Card>
            <div className="font-extrabold mb-2">{t('gettingStartedCardTitle')}</div>
            <div className="text-[15px] opacity-90">
              {t('gettingStartedIntro')}
            </div>
            <ul className="mt-2 pl-4.5 leading-relaxed">
              <li>{t('gettingStartedLi1')}</li>
              <li>{t('gettingStartedLi2')}</li>
              <li>{t('gettingStartedLi3')}</li>
              <li>{t('gettingStartedLi4')}</li>
            </ul>
          </Card>
          <Card>
            <div className="font-extrabold mb-2">{t('featuresTitle')}</div>
            <ul className="m-0 pl-4.5 leading-relaxed">
              <li>{t('featuresLi1')}</li>
              <li>{t('featuresLi2')}</li>
              <li>{t('featuresLi3')}</li>
              <li>{t('featuresLi4')}</li>
              <li>{t('featuresLi5')}</li>
              <li>{t('featuresLi6')}</li>
              <li>{t('featuresLi7')}</li>
              <li>{t('featuresLi8')}</li>
            </ul>
          </Card>

          {categories.map((catKey) => (
            <Card key={catKey} id={catKey}>
              <div className="font-extrabold mb-2">{t(catKey)}</div>
              <div className="grid gap-2.5">
                {questions.filter((q) => q.categoryKey === catKey).map((q) => (
                  <QAItem key={q.id} title={q.title} answer={q.answer} expandLabel={t('expand')} collapseLabel={t('collapse')} />
                ))}
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

const Badge = ({ label }: { label: string }) => (
  <span className="px-2.5 py-1.5 rounded-full bg-white/12 border border-white/20 text-xs">
    {label}
  </span>
);

const Card = ({ id, children }: { id?: string; children: React.ReactNode }) => (
  <section
    id={id}
    className="p-4 border border-white/10 rounded-xl bg-white/5 backdrop-blur-md text-white shadow-[0_8px_24px_rgba(0,0,0,0.25)]"
  >
    {children}
  </section>
);

const QAItem = ({ title, answer, expandLabel, collapseLabel }: { title: string; answer: React.ReactNode; expandLabel: string; collapseLabel: string }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-white/10 rounded-xl bg-white/5 backdrop-blur-md text-white shadow-[0_6px_18px_rgba(0,0,0,0.25)]">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full text-left bg-transparent border-0 p-3 cursor-pointer font-bold text-white hover:bg-white/10 transition-colors"
      >
        {title}
        <span className="float-right opacity-60">{open ? collapseLabel : expandLabel}</span>
      </button>
      {open && (
        <div className="px-3 pb-3 border-t border-white/10 text-[15px] opacity-90">
          {answer}
        </div>
      )}
    </div>
  );
};
