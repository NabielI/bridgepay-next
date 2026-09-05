import {
  Award,
  BadgeCheck,
  BriefcaseBusiness,
  ExternalLink,
  Globe2,
  Languages,
  Sparkles,
  UserRoundCheck,
} from "lucide-react";
import { Children, type ReactNode } from "react";

interface CvGig {
  id: string;
  title: string;
  category: string;
  skills: string[];
  startingPrice: number;
  currency: string;
}

interface FreelancerCvProfileProps {
  freelancer: {
    id: string;
    name: string | null;
    email: string;
    bio: string | null;
    skills: string[];
    rate: string | null;
    kycStatus: "pending" | "verified" | "rejected";
    freelancerExperiences: {
      id: string;
      company: string;
      position: string;
      period: string;
      description: string;
    }[];
    portfolioProjects: {
      id: string;
      title: string;
      description: string;
      link: string | null;
      imageUrl: string | null;
    }[];
    freelancerLanguages: {
      id: string;
      language: string;
      level: string;
    }[];
    freelancerCertifications: {
      id: string;
      name: string;
      issuer: string;
      issueDate: string;
      credentialUrl: string | null;
    }[];
    gigs: CvGig[];
  };
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
  }).format(new Date(value));
}

export function FreelancerCvProfile({ freelancer }: FreelancerCvProfileProps) {
  const displayName = freelancer.name ?? freelancer.email;

  return (
    <section className="mx-auto grid max-w-6xl gap-6">
      <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="mb-1 text-xs font-semibold uppercase text-primary">
              Freelancer CV
            </p>
            <h1 className="text-3xl font-bold text-slate-950">{displayName}</h1>
            <p className="mt-2 text-sm text-slate-500">{freelancer.email}</p>
            {freelancer.rate ? (
              <p className="mt-3 text-sm font-semibold text-primary">
                {freelancer.rate}
              </p>
            ) : null}
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-50 px-3 py-1.5 text-sm font-semibold text-primary">
            <BadgeCheck className="h-4 w-4" />
            KYC {freelancer.kycStatus}
          </span>
        </div>
        <p className="mt-5 max-w-3xl text-sm leading-6 text-slate-600">
          {freelancer.bio ??
            "Freelancer belum menambahkan ringkasan profil."}
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
        <main className="grid gap-6">
          <CvSection
            icon={<BriefcaseBusiness className="h-5 w-5" />}
            title="Pengalaman Kerja"
            empty="Belum ada pengalaman kerja."
          >
            {freelancer.freelancerExperiences.map((experience) => (
              <article
                key={experience.id}
                className="rounded-xl border border-slate-200 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-slate-950">
                      {experience.position}
                    </h3>
                    <p className="mt-1 text-sm font-semibold text-primary">
                      {experience.company}
                    </p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                    {experience.period}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  {experience.description}
                </p>
              </article>
            ))}
          </CvSection>

          <CvSection
            icon={<Sparkles className="h-5 w-5" />}
            title="Portfolio Project"
            empty="Belum ada portfolio project."
          >
            {freelancer.portfolioProjects.map((portfolio) => (
              <article
                key={portfolio.id}
                className="overflow-hidden rounded-xl border border-slate-200"
              >
                {portfolio.imageUrl ? (
                  <div
                    className="h-40 w-full bg-slate-100 bg-cover bg-center"
                    style={{ backgroundImage: `url(${portfolio.imageUrl})` }}
                    aria-label={`Screenshot ${portfolio.title}`}
                  />
                ) : null}
                <div className="p-4">
                  <h3 className="font-bold text-slate-950">
                    {portfolio.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {portfolio.description}
                  </p>
                  {portfolio.link ? (
                    <a
                      href={portfolio.link}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
                    >
                      Lihat project
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  ) : null}
                </div>
              </article>
            ))}
          </CvSection>

          <CvSection
            icon={<Award className="h-5 w-5" />}
            title="Sertifikasi"
            empty="Belum ada sertifikasi."
          >
            {freelancer.freelancerCertifications.map((certification) => (
              <article
                key={certification.id}
                className="rounded-xl border border-slate-200 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-slate-950">
                      {certification.name}
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">
                      {certification.issuer} -{" "}
                      {formatDate(certification.issueDate)}
                    </p>
                  </div>
                  {certification.credentialUrl ? (
                    <a
                      href={certification.credentialUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      Verifikasi
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  ) : null}
                </div>
              </article>
            ))}
          </CvSection>
        </main>

        <aside className="grid content-start gap-6">
          <CvSection
            icon={<UserRoundCheck className="h-5 w-5" />}
            title="Skill"
            empty="Belum ada skill."
          >
            <div className="flex flex-wrap gap-2">
              {freelancer.skills.map((skill) => (
                <span
                  key={skill}
                  className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600"
                >
                  {skill}
                </span>
              ))}
            </div>
          </CvSection>

          <CvSection
            icon={<Languages className="h-5 w-5" />}
            title="Kemampuan Bahasa"
            empty="Belum ada bahasa."
          >
            {freelancer.freelancerLanguages.map((language) => (
              <div
                key={language.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
              >
                <span className="font-semibold text-slate-950">
                  {language.language}
                </span>
                <span className="text-slate-500">{language.level}</span>
              </div>
            ))}
          </CvSection>

          <CvSection
            icon={<Globe2 className="h-5 w-5" />}
            title="Gig Published"
            empty="Belum ada gig published."
          >
            {freelancer.gigs.map((gig) => (
              <article key={gig.id} className="rounded-xl border border-slate-200 p-4">
                <h3 className="font-bold text-slate-950">{gig.title}</h3>
                <p className="mt-1 text-xs text-slate-500">{gig.category}</p>
                <p className="mt-3 text-sm font-semibold text-primary">
                  From {gig.currency} {gig.startingPrice.toLocaleString("en-US")}
                </p>
              </article>
            ))}
          </CvSection>
        </aside>
      </div>
    </section>
  );
}

function CvSection({
  icon,
  title,
  empty,
  children,
}: {
  icon: ReactNode;
  title: string;
  empty: string;
  children: ReactNode;
}) {
  const hasContent = Children.count(children) > 0;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
      <div className="mb-4 flex items-center gap-2">
        <span className="text-primary">{icon}</span>
        <h2 className="font-bold text-slate-950">{title}</h2>
      </div>
      {hasContent ? (
        <div className="grid gap-3">{children}</div>
      ) : (
        <p className="text-sm text-slate-500">{empty}</p>
      )}
    </section>
  );
}
