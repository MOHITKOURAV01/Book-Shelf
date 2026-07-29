import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar.jsx';
import Footer from '../components/Footer.jsx';
import ThemeToggle from '../components/ThemeToggle.jsx';
import './TermsOfService.css';

export default function TermsOfService() {
  /* Scroll to top on mount */
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const lastUpdated = 'July 25, 2025';
  const effectiveDate = 'August 1, 2025';

  return (
    <div className="tos-page">
      {/* ── Theme toggle ── */}
      <ThemeToggle />

      {/* ── Navbar ── */}
      <Navbar cartCount={0} onCartClick={() => {}} />
      <div className="nav-spacer" />

      {/* ── Hero Section ── */}
      <section className="tos-hero">
        <div className="tos-hero__inner">
          <p className="tos-hero__eyebrow">Legal &amp; Policy</p>
          <h1 className="tos-hero__title">Terms of <em>Service</em></h1>
          <p className="tos-hero__updated">
            <span>Last Updated: {lastUpdated}</span>
            <span className="tos-hero__bullet">•</span>
            <span>Effective Date: {effectiveDate}</span>
          </p>
          <p className="tos-hero__sub">
            Please read these Terms of Service carefully before purchasing books, creating an account, or browsing the BookShelf platform.
          </p>
        </div>
      </section>

      {/* ── Summary Key Takeaways Banner ── */}
      <section className="tos-summary">
        <div className="tos-summary__inner">
          <h2 className="tos-summary__title">At a Glance — Key Takeaways</h2>
          <div className="tos-summary__grid">
            <div className="tos-summary__card">
              <div className="tos-summary__icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                </svg>
              </div>
              <h3>Binding Agreement</h3>
              <p>By browsing, creating an account, or placing an order on BookShelf, you enter into a legal contract governed by these Terms.</p>
            </div>
            <div className="tos-summary__card">
              <div className="tos-summary__icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
                  <line x1="1" y1="10" x2="23" y2="10" />
                </svg>
              </div>
              <h3>Fair Pricing &amp; Orders</h3>
              <p>All transactions are processed securely. Prices are clearly listed, and refunds are covered by our 14-day policy for physical items.</p>
            </div>
            <div className="tos-summary__card">
              <div className="tos-summary__icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </div>
              <h3>Copyright Protection</h3>
              <p>Book Content, author materials, and storefront designs are protected by copyright laws. Unauthorized reproduction is strictly prohibited.</p>
            </div>
            <div className="tos-summary__card">
              <div className="tos-summary__icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </div>
              <h3>Respectful Community</h3>
              <p>User reviews and community interactions must remain respectful, honest, and free of malicious spam, hate speech, or harassment.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Main Legal Content Layout ── */}
      <article className="tos-content">
        <div className="tos-content__inner">

          {/* Sticky Table of Contents Sidebar */}
          <nav className="tos-toc">
            <h2 className="tos-toc__title">Table of Contents</h2>
            <ol className="tos-toc__list">
              <li><a href="#section-1">1. Acceptance of Terms</a></li>
              <li><a href="#section-2">2. Platform Definitions</a></li>
              <li><a href="#section-3">3. Account Registration &amp; Security</a></li>
              <li><a href="#section-4">4. User Eligibility &amp; Minors</a></li>
              <li><a href="#section-5">5. Orders, Pricing &amp; Availability</a></li>
              <li><a href="#section-6">6. Payment Processing &amp; Billing</a></li>
              <li><a href="#section-7">7. Shipping, Delivery &amp; Title</a></li>
              <li><a href="#section-8">8. Returns, Refunds &amp; Cancellations</a></li>
              <li><a href="#section-9">9. Digital Content &amp; E-Book License</a></li>
              <li><a href="#section-10">10. Intellectual Property Rights</a></li>
              <li><a href="#section-11">11. User Conduct &amp; Restrictions</a></li>
              <li><a href="#section-12">12. User Reviews &amp; Submissions</a></li>
              <li><a href="#section-13">13. Third-Party Links &amp; Services</a></li>
              <li><a href="#section-14">14. Disclaimer of Warranties</a></li>
              <li><a href="#section-15">15. Limitation of Liability</a></li>
              <li><a href="#section-16">16. Indemnification</a></li>
              <li><a href="#section-17">17. Dispute Resolution &amp; Arbitration</a></li>
              <li><a href="#section-18">18. Governing Law &amp; Jurisdiction</a></li>
              <li><a href="#section-19">19. Severability &amp; Entire Agreement</a></li>
              <li><a href="#section-20">20. Amendments &amp; Contact Notice</a></li>
            </ol>
          </nav>

          {/* Detailed Legal Sections */}
          <div className="tos-sections">

            <section className="tos-section" id="section-1">
              <div className="tos-section__number">01</div>
              <h2 className="tos-section__title">Acceptance of Terms</h2>
              <p>Welcome to BookShelf. These Terms of Service ("Terms", "Agreement") govern your access to and use of the website located at <strong>bookshelf.com</strong>, including all subdomains, mobile-optimized versions, and services provided by BookShelf ("we", "us", "our").</p>
              <p>By visiting our website, creating an account, browsing our catalog, or purchasing items from BookShelf, you acknowledge that you have read, understood, and agree to be bound by these Terms, as well as our <Link to="/privacy">Privacy Policy</Link>. If you do not agree to all of these Terms, you are expressly prohibited from using the platform and must discontinue use immediately.</p>
              <div className="tos-callout">
                <div className="tos-callout__icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="16" x2="12" y2="12" />
                    <line x1="12" y1="8" x2="12.01" y2="8" />
                  </svg>
                </div>
                <p><strong>Important Note:</strong> We recommend saving or printing a copy of these Terms for your personal records. These terms constitute a legally binding agreement between you and BookShelf.</p>
              </div>
            </section>

            <section className="tos-section" id="section-2">
              <div className="tos-section__number">02</div>
              <h2 className="tos-section__title">Platform Definitions</h2>
              <p>Throughout this document, the following terms carry specific legal definitions:</p>
              <ul>
                <li><strong>"Platform" / "Services":</strong> Refers collectively to the BookShelf e-commerce storefront, online catalog, digital reader interface, APIs, customer support, and related digital services.</li>
                <li><strong>"User" / "Customer":</strong> Any individual or entity accessing the website, registering an account, or conducting transactions on BookShelf.</li>
                <li><strong>"Physical Products":</strong> Printed books, hardcover editions, paperbacks, bookish merchandise, bookmarks, and physical goods sold via BookShelf.</li>
                <li><strong>"Digital Products":</strong> E-books, audiobooks, downloadable literary content, and digital publications provided under license.</li>
                <li><strong>"User Content":</strong> Product reviews, comments, ratings, reading list titles, profile descriptions, and communications submitted by users.</li>
              </ul>
            </section>

            <section className="tos-section" id="section-3">
              <div className="tos-section__number">03</div>
              <h2 className="tos-section__title">Account Registration &amp; Security</h2>
              <p>To access certain features of BookShelf, such as saving reading lists, writing reviews, and placing orders, you may be required to register for an account. When creating an account, you agree to the following conditions:</p>
              <ul>
                <li><strong>Accuracy of Information:</strong> You agree to provide true, accurate, current, and complete registration information and maintain its accuracy at all times.</li>
                <li><strong>Credential Confidentiality:</strong> You are solely responsible for maintaining the confidentiality of your account credentials, password, and access codes.</li>
                <li><strong>Account Activity:</strong> You accept full responsibility for all activities, purchases, and communications performed under your account.</li>
                <li><strong>Unauthorized Access:</strong> You must immediately notify BookShelf at <a href="mailto:support@bookshelf.com">support@bookshelf.com</a> if you suspect any breach of security or unauthorized access to your account.</li>
              </ul>
              <p>We reserve the right to suspend, disable, or terminate any account at our sole discretion if we determine you have violated any provision of these Terms.</p>
            </section>

            <section className="tos-section" id="section-4">
              <div className="tos-section__number">04</div>
              <h2 className="tos-section__title">User Eligibility &amp; Minors</h2>
              <p>BookShelf is intended for general audiences. By using the Platform, you represent and warrant that:</p>
              <ul>
                <li>You are at least 18 years of age, or possess legal parental or guardian consent if you are between 13 and 17 years old.</li>
                <li>Children under 13 years of age may not register an account or submit personal data directly to BookShelf.</li>
                <li>You have not been previously suspended or removed from BookShelf.</li>
                <li>Your registration and use of BookShelf complies with all applicable local, national, and international laws.</li>
              </ul>
            </section>

            <section className="tos-section" id="section-5">
              <div className="tos-section__number">05</div>
              <h2 className="tos-section__title">Orders, Pricing &amp; Availability</h2>
              <p>All product descriptions, book prices, and availability displayed on BookShelf are subject to change at any time without notice. When you place an order on BookShelf:</p>
              <ul>
                <li><strong>Order Acceptance:</strong> Receipt of an electronic order confirmation does not signify our final acceptance of your order. We reserve the right to accept, decline, or limit order quantities for any reason.</li>
                <li><strong>Pricing Errors:</strong> Despite our best efforts, items in our catalog may occasionally be mispriced. If an item's correct price is higher than our stated price, we will contact you before shipping or cancel the order.</li>
                <li><strong>Stock Availability:</strong> In the event a book becomes out of stock or out of print prior to order fulfillment, we will notify you promptly and issue a full refund for the unavailable item.</li>
              </ul>
            </section>

            <section className="tos-section" id="section-6">
              <div className="tos-section__number">06</div>
              <h2 className="tos-section__title">Payment Processing &amp; Billing</h2>
              <p>BookShelf supports multiple secure payment methods including major credit cards, debit cards, UPI, and digital wallet integrations. By submitting payment information, you agree to the following terms:</p>
              <ul>
                <li><strong>Authorization:</strong> You authorize BookShelf and its authorized payment gateways (e.g., Stripe, Razorpay) to charge your selected payment instrument for all orders placed under your account.</li>
                <li><strong>Tax Responsibilities:</strong> Applicable sales taxes, GST, or value-added taxes will be calculated at checkout based on your shipping location and item categorization.</li>
                <li><strong>Fraud Detection:</strong> We employ automated fraud monitoring. Orders flagged for suspicious activity may require additional identity verification or be subject to cancellation.</li>
              </ul>
              <div className="tos-callout">
                <div className="tos-callout__icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
                    <line x1="1" y1="10" x2="23" y2="10" />
                  </svg>
                </div>
                <p><strong>Payment Security:</strong> BookShelf never stores full credit card numbers or CVV codes on our servers. All transactions are processed using 256-bit SSL encryption and PCI-DSS Level 1 compliant infrastructure.</p>
              </div>
            </section>

            <section className="tos-section" id="section-7">
              <div className="tos-section__number">07</div>
              <h2 className="tos-section__title">Shipping, Delivery &amp; Risk of Loss</h2>
              <p>Physical orders are dispatched through trusted courier partners. The following shipping terms apply:</p>
              <ul>
                <li><strong>Delivery Timelines:</strong> Delivery estimates provided during checkout are non-binding estimates. We are not liable for shipping delays caused by weather, customs clearance, or carrier disruptions.</li>
                <li><strong>Risk of Loss:</strong> All physical items purchased from BookShelf are made pursuant to a shipment contract. Risk of loss and title for such items pass to you upon our delivery to the carrier.</li>
                <li><strong>International Shipping:</strong> For international orders, customers are responsible for paying any import duties, tariffs, customs fees, or taxes levied by destination authorities.</li>
              </ul>
            </section>

            <section className="tos-section" id="section-8">
              <div className="tos-section__number">08</div>
              <h2 className="tos-section__title">Returns, Refunds &amp; Cancellations</h2>
              <p>We want you to be completely satisfied with your reading experience. Our return policy is structured as follows:</p>
              <ul>
                <li><strong>14-Day Return Window:</strong> You may return undamaged, unread physical books in their original packaging within 14 days of delivery for a full refund or exchange.</li>
                <li><strong>Damaged or Incorrect Items:</strong> If you receive a damaged book, printing defect, or wrong item, please notify us within 48 hours of receipt with photo evidence to receive a free replacement.</li>
                <li><strong>Return Shipping:</strong> Customers are responsible for return shipping costs unless the return is due to a fulfillment error or defective product on our part.</li>
                <li><strong>Refund Processing:</strong> Approved refunds will be credited back to your original payment method within 5 to 7 business days following inspect and approval at our warehouse.</li>
              </ul>
            </section>

            <section className="tos-section" id="section-9">
              <div className="tos-section__number">09</div>
              <h2 className="tos-section__title">Digital Content &amp; E-Book License</h2>
              <p>When purchasing digital books, e-books, or downloadable audio files on BookShelf:</p>
              <ul>
                <li><strong>Limited License:</strong> BookShelf grants you a personal, non-exclusive, non-transferable, non-sublicensable license to download and access the digital content for personal, non-commercial reading.</li>
                <li><strong>Restrictions:</strong> You may not copy, share, redistribute, sell, broadcast, alter, perform Digital Rights Management (DRM) removal, or upload digital content to file-sharing networks.</li>
                <li><strong>No Refunds on Digital Content:</strong> Digital downloads are non-refundable once access or download links have been delivered to your account or email address.</li>
              </ul>
            </section>

            <section className="tos-section" id="section-10">
              <div className="tos-section__number">10</div>
              <h2 className="tos-section__title">Intellectual Property Rights</h2>
              <p>The BookShelf platform and all of its original content, features, functionality, brand assets, typography, UI designs, graphics, and code are owned by BookShelf and protected by international copyright, trademark, trade secret, and intellectual property laws.</p>
              <p>Book covers, book titles, author names, and excerpt excerpts remain the exclusive property of their respective publishers, authors, and copyright holders, displayed under license or fair editorial reference.</p>
            </section>

            <section className="tos-section" id="section-11">
              <div className="tos-section__number">11</div>
              <h2 className="tos-section__title">User Conduct &amp; Prohibited Activities</h2>
              <p>When interacting with BookShelf, you agree NOT to engage in any of the following prohibited activities:</p>
              <ul>
                <li>Using automated bots, web scrapers, spiders, or data mining software to extract catalog information or prices.</li>
                <li>Attempting to bypass security mechanisms, probe system vulnerabilities, or gain unauthorized access to servers.</li>
                <li>Posting fraudulent reviews, artificial rating manipulation, or spam comments.</li>
                <li>Using BookShelf to distribute malware, phishing attempts, or illegal materials.</li>
                <li>Harassing, abusing, threatening, or impersonating other users, staff members, or authors.</li>
              </ul>
            </section>

            <section className="tos-section" id="section-12">
              <div className="tos-section__number">12</div>
              <h2 className="tos-section__title">User Reviews &amp; Submissions</h2>
              <p>BookShelf encourages community discussions and book reviews. By submitting reviews, ratings, or comments:</p>
              <ul>
                <li><strong>License Grant:</strong> You grant BookShelf a royalty-free, perpetual, worldwide license to publish, feature, translate, and display your reviews across our website and marketing channels.</li>
                <li><strong>Ownership:</strong> You retain ownership of your submitted text, but warrant that your content does not violate copyright, privacy rights, or contain defamatory material.</li>
                <li><strong>Moderation:</strong> We reserve the right (but have no obligation) to remove reviews containing profanity, spoilers, personal attacks, or promotional links.</li>
              </ul>
            </section>

            <section className="tos-section" id="section-13">
              <div className="tos-section__number">13</div>
              <h2 className="tos-section__title">Third-Party Links &amp; Services</h2>
              <p>BookShelf may contain links to third-party websites, publisher portals, payment processors, or external services that are not owned or controlled by BookShelf.</p>
              <p>We have no control over, and assume no responsibility for, the content, privacy policies, or practices of any third-party websites. You access third-party links at your own risk.</p>
            </section>

            <section className="tos-section" id="section-14">
              <div className="tos-section__number">14</div>
              <h2 className="tos-section__title">Disclaimer of Warranties</h2>
              <p>THE BOOKSHELF PLATFORM, SERVICES, AND ALL PRODUCTS SOLD ARE PROVIDED ON AN <strong>"AS IS"</strong> AND <strong>"AS AVAILABLE"</strong> BASIS WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED.</p>
              <p>TO THE FULL EXTENT PERMISSIBLE BY APPLICABLE LAW, BOOKSHELF DISCLAIMS ALL WARRANTIES, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, AND NON-INFRINGEMENT.</p>
            </section>

            <section className="tos-section" id="section-15">
              <div className="tos-section__number">15</div>
              <h2 className="tos-section__title">Limitation of Liability</h2>
              <p>TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT SHALL BOOKSHELF, ITS DIRECTORS, EMPLOYEES, PARTNERS, OR SUPPLIERS BE LIABLE FOR ANY INDIRECT, INCIDENTAL, CONSEQUENTIAL, SPECIAL, OR PUNITIVE DAMAGES, INCLUDING WITHOUT LIMITATION LOSS OF PROFITS, DATA, USE, OR GOODWILL.</p>
              <p>OUR MAXIMUM TOTAL AGGREGATE LIABILITY ARISING FROM OR RELATED TO YOUR USE OF THE PLATFORM SHALL NOT EXCEED THE TOTAL AMOUNT PAID BY YOU TO BOOKSHELF IN THE SIX (6) MONTHS PRECEDING THE CLAIM.</p>
            </section>

            <section className="tos-section" id="section-16">
              <div className="tos-section__number">16</div>
              <h2 className="tos-section__title">Indemnification</h2>
              <p>You agree to defend, indemnify, and hold harmless BookShelf, its affiliates, licensors, and service providers from and against any claims, liabilities, damages, judgments, awards, losses, costs, expenses, or fees (including reasonable attorneys' fees) arising out of or relating to your violation of these Terms or your misuse of the Platform.</p>
            </section>

            <section className="tos-section" id="section-17">
              <div className="tos-section__number">17</div>
              <h2 className="tos-section__title">Dispute Resolution &amp; Binding Arbitration</h2>
              <p>In the event of any dispute, claim, or controversy arising out of these Terms or the breach thereof:</p>
              <ul>
                <li><strong>Informal Negotiation:</strong> Both parties agree to first attempt to resolve any dispute informally for at least 30 days by contacting <a href="mailto:legal@bookshelf.com">legal@bookshelf.com</a>.</li>
                <li><strong>Binding Arbitration:</strong> If unresolved informally, disputes shall be submitted to final and binding arbitration in accordance with applicable arbitration rules, rather than litigated in court.</li>
                <li><strong>Class Action Waiver:</strong> YOU AGREE THAT DISPUTES WILL BE ARBITRATED ON AN INDIVIDUAL BASIS AND NOT AS A CLASS ACTION OR REPRESENTATIVE PROCEEDING.</li>
              </ul>
            </section>

            <section className="tos-section" id="section-18">
              <div className="tos-section__number">18</div>
              <h2 className="tos-section__title">Governing Law &amp; Jurisdiction</h2>
              <p>These Terms shall be governed by and construed in accordance with the laws of India, without giving effect to any principles of conflicts of law. You agree that any legal action arising out of these Terms shall be filed exclusively in the state or federal courts located in Pune, Maharashtra, India.</p>
            </section>

            <section className="tos-section" id="section-19">
              <div className="tos-section__number">19</div>
              <h2 className="tos-section__title">Severability &amp; Entire Agreement</h2>
              <p>If any provision of these Terms is found to be unlawful, void, or unenforceable, that provision shall be deemed severable and shall not affect the validity and enforceability of any remaining provisions.</p>
              <p>These Terms, together with our <Link to="/privacy">Privacy Policy</Link> and <Link to="/about">About Us</Link> documentation, constitute the entire agreement between you and BookShelf regarding your use of the Platform.</p>
            </section>

            <section className="tos-section" id="section-20">
              <div className="tos-section__number">20</div>
              <h2 className="tos-section__title">Amendments &amp; Contact Notice</h2>
              <p>We reserve the right to modify these Terms at any time. When we make material revisions, we will post the updated Terms on this page and revise the "Last Updated" date at the top of this page. Your continued use of BookShelf following notification of changes signifies your acceptance of the modified Terms.</p>

              <div className="tos-contact-card">
                <h3 className="tos-contact-card__title">Have Legal Questions?</h3>
                <p className="tos-contact-card__sub">Our legal and customer experience teams are available to address any inquiries regarding these terms.</p>
                <div className="tos-contact-card__details">
                  <div className="tos-contact-card__row">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                      <polyline points="22,6 12,13 2,6" />
                    </svg>
                    <span><strong>Email:</strong> <a href="mailto:legal@bookshelf.com">legal@bookshelf.com</a></span>
                  </div>
                  <div className="tos-contact-card__row">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                      <circle cx="12" cy="10" r="3" />
                    </svg>
                    <span><strong>Legal Address:</strong> BookShelf Pvt Ltd, FC Road, Shivajinagar, Pune, Maharashtra 411005, India</span>
                  </div>
                </div>
              </div>
            </section>

          </div>
        </div>
      </article>
    </div>
  );
}
