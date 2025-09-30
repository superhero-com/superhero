import React from 'react';
import FooterSection from '../components/layout/FooterSection';

export default function Privacy() {
  return (
    <>
    <div className="max-w-[980px] mx-auto p-4">
      <h2 className="text-2xl font-bold text-white mb-2">PRIVACY POLICY</h2>
      <p className="text-white/70 mb-6">The present Privacy Policy was last updated on 29th of September 2025.</p>

      <h3 className="text-xl font-semibold text-white mb-2">I. Introduction</h3>
      <p className="text-white/80 mb-4 leading-relaxed">
        Superhero.com is an open-source, decentralised protocol deployed on æternity blockchain. The protocol operates
        in a distributed manner, and no single party controls or operates the underlying smart contracts. Users
        interact with the protocol directly, at their own discretion and risk.
      </p>
      <p className="text-white/80 mb-4 leading-relaxed">
        Superhero.com LVC, with address Dr. Grass-Strasse 12, Vaduz, 9490 Liechtenstein ("the Company") provides and
        maintains this website and related interfaces (the "Interface") to facilitate access to the protocol.
      </p>
      <p className="text-white/80 mb-4 leading-relaxed">
        This Privacy Policy explains how Superhero.com handles information in connection with your use of the Platform
        and its website/interface. If you have any questions regarding this Policy, please contact us at
        superherowallet@protonmail.com. If you do not agree to the terms of this Policy, please do not use the Website.
        Each time you use the Website, the current version of this Policy will apply. The new version of the Privacy
        Policy becomes effective from the day it is announced publicly on the Website unless stated otherwise.
      </p>

      <h3 className="text-xl font-semibold text-white mb-2">II. Definitions</h3>
      <ul className="text-white/80 mb-4 leading-relaxed list-disc pl-6">
        <li><span className="font-semibold">Data Controller</span> means the person or body which, alone or jointly
          with others, determines the purposes and means of the processing of personal data.</li>
        <li><span className="font-semibold">Personal Data</span> means any information relating to an identified or
          identifiable natural person (USER).</li>
        <li><span className="font-semibold">Processing</span> means any operation or set of operations which is
          performed on personal data.</li>
        <li><span className="font-semibold">Recipient</span> means a natural or legal person, public authority, agency
          or another body, to which the personal data are disclosed, whether a third party or not.</li>
        <li><span className="font-semibold">Personal data breach</span> means a breach of security leading to the
          accidental or unlawful destruction, loss, alteration, unauthorized disclosure of, or access to, personal data
          transmitted, stored or otherwise processed.</li>
      </ul>

      <h3 className="text-xl font-semibold text-white mb-2">III. Personal data collection</h3>
      <p className="text-white/80 mb-2 leading-relaxed">The Platform is designed to operate in a decentralized
        manner. All user interactions with the application occur directly on the blockchain. As a result:</p>
      <ul className="text-white/80 mb-4 leading-relaxed list-disc pl-6">
        <li>We do not collect, store, or process any personal data in connection with on-chain transactions.</li>
        <li>Wallet addresses and transaction information recorded on the blockchain are not under our control and
          cannot be amended, deleted, or altered.</li>
        <li>We do not track, log, or otherwise collect off-chain identifiers such as IP addresses, cookies, or
          analytics, unless explicitly stated elsewhere in this Privacy Policy.</li>
      </ul>

      <h3 className="text-xl font-semibold text-white mb-2">Implications for Users</h3>
      <ul className="text-white/80 mb-4 leading-relaxed list-disc pl-6">
        <li>Your activity on the blockchain is pseudonymous, but may be considered personal data under GDPR if it can
          be linked to an identifiable individual.</li>
        <li>Since we do not control the blockchain, we cannot modify or erase on-chain data, and we do not act as a
          data controller for such information.</li>
        <li>Any off-chain data voluntarily submitted (for example, support requests) will be processed in accordance
          with GDPR and relevant data protection laws.</li>
      </ul>

      <h3 className="text-xl font-semibold text-white mb-2">Personal data in relation to User support and communication</h3>
      <p className="text-white/80 mb-4 leading-relaxed">
        During the use of our Website, users may decide to contact the team in relation to website support, troubleshoot
        problems, questions, etc. The collection of personal data is initiated by Users, and they decide what type of
        personal data to include in the communication. Therefore, the legal basis for processing is that the User has
        given consent to the processing of their personal data for one or more specific purposes, specifically Article
        6(1) of the General Data Protection Regulation (Regulation (EU) 2016/679). The retention period is until the
        questions have been answered, assistance from the team has been provided, the problems have been solved, or in
        any other case, until withdrawal of consent. Superhero.com may retain personal information for an additional
        period of time if it is required by law or for crime/breach/infringement prevention and safety.
      </p>

      <h3 className="text-xl font-semibold text-white mb-2">IV. Your rights</h3>
      <p className="text-white/80 mb-2 leading-relaxed">With regard to the information stored off-chain, if any, YOU
        have the right to:</p>
      <ul className="text-white/80 mb-4 leading-relaxed list-disc pl-6">
        <li>Request from Superhero.com access to the personal data that we hold about You in a portable format.</li>
        <li>Request from Superhero.com the correction of any collected personal data. The information may include only
          your personal data collection.</li>
        <li>Receive a copy of your personal data in electronic format.</li>
        <li>“The right to be forgotten” – You have the right to request the deletion of your personal data at any time
          where the retention of such data infringes relevant legislation.</li>
        <li>Receive information from Us about Our activities in connection to your personal data, including the
          purposes of collection and storage, the period of time for storage, the methods of collecting, and the
          presence of automated processing.</li>
        <li>Receive your data and transfer it to another controller.</li>
        <li>You have the right to lodge a complaint with a supervisory authority, in particular in the Member State of
          your habitual residence, place of work or place of the alleged infringement if You consider that there is a
          personal data breach.</li>
      </ul>

      <h3 className="text-xl font-semibold text-white mb-2">V. Sharing of Personal Information with Third Parties – Recipients</h3>
      <p className="text-white/80 mb-4 leading-relaxed">
        We may disclose USERS' identifiable personal information to third parties under special circumstances: (i) to
        comply with a legal requirement, judicial proceeding, court order, or legal process served on Superhero.com or
        its affiliates; (ii) to investigate a possible crime, such as fraud or identity theft; (iii) to Public
        Authorities in accordance with their legal obligation for the exercise of their official mission, such as tax
        and customs authorities, financial investigation units, independent administrative authorities, or financial
        market authorities responsible for supervision of securities markets; (iv) in connection with the sale,
        purchase, business transition under any form, merger, dissolution, reorganization, liquidation of Superhero.com
        (we may have to disclose the information You have given us to the successor who is part of the transition);
        (v) when We believe it is necessary to protect the rights, property, or safety of Superhero.com or other
        persons; or (vi) as otherwise required or permitted by law, including any contractual obligations of
        Superhero.com.
      </p>

      <h3 className="text-xl font-semibold text-white mb-2">VI. Children and Privacy</h3>
      <p className="text-white/80 mb-4 leading-relaxed">
        Superhero.com does not process information of persons under the age of obtaining full legal capacity (in most
        countries 18 years old) due to the character of the Website and the Wallet. Superhero.com will immediately
        delete any personal data referring to persons under the age of full legal capacity. We are not liable in any way
        if YOU provide false information about your age or use the Website before YOU have turned the above-mentioned
        age.
      </p>

      <h3 className="text-xl font-semibold text-white mb-2">VII. Breach measures</h3>
      <p className="text-white/80 mb-4 leading-relaxed">
        In case of breach, We will undertake every possible action according to the applicable legislation in an
        appropriate and timely manner, to avoid any material or non-material damage to Users and to protect the personal
        data of Users.
      </p>

      <h3 className="text-xl font-semibold text-white mb-2">VIII. How do I contact Superhero.com?</h3>
      <p className="text-white/80 leading-relaxed">
        To contact us with your questions or comments regarding this Policy or the information collection and
        dissemination practices of Superhero.com relevant to your use of the Website, please email us at
        superherowallet@protonmail.com.
      </p>
    </div>
    <div className="mt-8">
      <FooterSection />
    </div>
    </>
  );
}


