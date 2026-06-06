export function SeoHero({
  eyebrow,
  title,
  intro,
}: {
  eyebrow?: string;
  title: string;
  intro: string;
}) {
  return (
    <section className="border-b border-gray-100 bg-gradient-to-b from-beige/50 to-white px-6 py-16 md:py-20">
      <div className="mx-auto max-w-3xl">
        {eyebrow ? (
          <p className="mb-3 text-xs font-medium tracking-[0.18em] text-champagne uppercase">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="mb-5 font-serif text-4xl leading-tight text-navy md:text-5xl">
          {title}
        </h1>
        <p className="text-lg leading-relaxed text-gray-600">{intro}</p>
      </div>
    </section>
  );
}
