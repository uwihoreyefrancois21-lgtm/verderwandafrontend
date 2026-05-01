import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import heroImg from '../assets/hero.png'
import { SERVICE_IMAGE } from '../constants/serviceImages'
import { apiFetch } from '../services/api'
import { resolveMediaUrl } from '../utils/mediaUrl'

function truncateText(text, max = 140) {
  if (!text) return ''
  const t = String(text).replace(/\s+/g, ' ').trim()
  if (t.length <= max) return t
  return `${t.slice(0, max).trim()}…`
}

function formatProjectDate(v) {
  if (!v) return ''
  const s = String(v)
  return s.length >= 10 ? s.slice(0, 10) : s
}

function getEmbeddedVideoUrl(url) {
  const raw = String(url || '').trim()
  if (!raw) return ''

  // YouTube: youtu.be/<id> or youtube.com/watch?v=<id>
  const ytShort = raw.match(/^https?:\/\/(?:www\.)?youtu\.be\/([^?&#/]+)/i)
  if (ytShort?.[1]) return `https://www.youtube.com/embed/${ytShort[1]}?autoplay=1&mute=1&loop=1&playlist=${ytShort[1]}`

  const ytLong = raw.match(/^https?:\/\/(?:www\.)?youtube\.com\/watch\?[^#]*v=([^?&#/]+)/i)
  if (ytLong?.[1]) return `https://www.youtube.com/embed/${ytLong[1]}?autoplay=1&mute=1&loop=1&playlist=${ytLong[1]}`

  // Vimeo
  const vimeo = raw.match(/^https?:\/\/(?:www\.)?vimeo\.com\/(\d+)/i)
  if (vimeo?.[1]) return `https://player.vimeo.com/video/${vimeo[1]}?autoplay=1&muted=1&loop=1&background=1`

  return ''
}

function getYouTubeVideoId(url) {
  const raw = String(url || '').trim()
  if (!raw) return ''
  const ytShort = raw.match(/^https?:\/\/(?:www\.)?youtu\.be\/([^?&#/]+)/i)
  if (ytShort?.[1]) return ytShort[1]
  const ytLong = raw.match(/^https?:\/\/(?:www\.)?youtube\.com\/watch\?[^#]*v=([^?&#/]+)/i)
  if (ytLong?.[1]) return ytLong[1]
  return ''
}

export default function HomePage() {
  const [projects, setProjects] = useState([])
  const [bannerPosts, setBannerPosts] = useState([])
  const normalizedBanners = bannerPosts
    .map((post) => {
      const mediaType = String(post?.media_type || '').toLowerCase()
      const source = resolveMediaUrl(post?.media_source)
      const thumb = resolveMediaUrl(post?.thumbnail)
      const text = String(post?.content || '').trim()
      const embedded = mediaType === 'video' ? getEmbeddedVideoUrl(source) : ''
      const ytId = mediaType === 'video' ? getYouTubeVideoId(source) : ''
      const fallbackThumb = ytId ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` : ''
      const previewThumb = thumb || fallbackThumb || source
      const isValid =
        mediaType === 'text'
          ? Boolean(post?.title || text)
          : mediaType === 'image' || mediaType === 'video'
            ? Boolean(source)
            : Boolean(source || post?.title || text)
      return { ...post, mediaType, source, thumb: previewThumb, embedded, text, isValid }
    })
    .filter((post) => post.isValid)
  const primaryBanner = normalizedBanners[0] || null

  useEffect(() => {
    let cancelled = false
    async function loadProjects() {
      try {
        const data = await apiFetch('/projects')
        if (!cancelled) setProjects(Array.isArray(data) ? data : [])
      } catch {
        // keep empty; placeholders still render
      }
    }
    void loadProjects()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    async function loadBannerPosts() {
      try {
        const data = await apiFetch('/media-posts?position=home&is_active=true')
        if (!cancelled) setBannerPosts(Array.isArray(data) ? data : [])
      } catch {
        if (!cancelled) setBannerPosts([])
      }
    }
    void loadBannerPosts()
    return () => {
      cancelled = true
    }
  }, [])

  const services = [
    {
      title: 'Plumbing & Water Systems',
      description: 'Design, installation and maintenance for reliable plumbing systems.',
      imageKey: 'plumbing',
    },
    {
      title: 'Equipment Rentals',
      description: 'Dependable Constructions and plumbing equipment for your projects.',
      imageKey: 'rent',
    },
    {
      title: 'Water Supply Solutions',
      description: 'Design, Constructions and supervision for distribution networks and storage.',
      imageKey: 'water',
    },
    {
      title: 'Job Opportunity',
      description: 'Connecting skilled job seekers with employers In all fields.',
      imageKey: 'jobs',
    },
    {
      title: 'Material Supply',
      description: 'High-quality water materials to support your installations.',
      imageKey: 'materials',
    },
  ]

  return (
    <main className="homeMain">
      {primaryBanner ? (
        <section
          className="homeBannerFull"
          style={{
            width: '90%',
            minHeight: '40vh',
            maxHeight: '520px',
            margin: '16px auto 0',
            position: 'relative',
            display: 'grid',
            alignItems: 'end',
            overflow: 'hidden',
            background: '#0f172a',
            borderRadius: 14,
          }}
        >
          {normalizedBanners.length > 1 ? (
            <div
              style={{
                position: 'relative',
                zIndex: 1,
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: 14,
                width: '100%',
                padding: '18px',
              }}
            >
              {normalizedBanners.slice(0, 6).map((post) => (
                <article
                  key={post.post_id}
                  style={{
                    position: 'relative',
                    minHeight: 210,
                    borderRadius: 12,
                    overflow: 'hidden',
                    background: '#0b1220',
                    border: '1px solid rgba(255,255,255,0.14)',
                  }}
                >
                  {post.mediaType === 'image' && post.source ? (
                    <img
                      src={post.source}
                      alt={post.title || 'Advertisement'}
                      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : null}
                  {post.mediaType === 'video' ? (
                    post.embedded ? (
                      <iframe
                        src={post.embedded}
                        title={post.title || 'Advertisement video'}
                        allow="autoplay; encrypted-media; picture-in-picture"
                        allowFullScreen
                        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }}
                      />
                    ) : post.source ? (
                      <video
                        src={post.source}
                        poster={post.thumb || undefined}
                        controls
                        preload="metadata"
                        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : null
                  ) : null}
                  {post.mediaType === 'text' && post.thumb ? (
                    <img
                      src={post.thumb}
                      alt={post.title || 'Advertisement'}
                      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : null}
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'linear-gradient(to top, rgba(0,0,0,0.74), rgba(0,0,0,0.18) 45%, rgba(0,0,0,0.08))',
                      pointerEvents: 'none',
                    }}
                    aria-hidden="true"
                  />
                  <div style={{ position: 'absolute', left: 12, right: 12, bottom: 10, color: '#fff', zIndex: 2 }}>
                    {post.title ? <h3 style={{ margin: 0, fontSize: 19 }}>{post.title}</h3> : null}
                    {post.content ? <p style={{ margin: '6px 0 0', fontSize: 13, opacity: 0.95 }}>{truncateText(post.content, 90)}</p> : null}
                  </div>
                </article>
              ))}
            </div>
          ) : null}

          {normalizedBanners.length === 1 && primaryBanner.mediaType === 'image' && primaryBanner.source ? (
            <img
              src={primaryBanner.source}
              alt={primaryBanner.title || 'Advertisement banner'}
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : null}
          {normalizedBanners.length === 1 && primaryBanner.mediaType === 'video' && primaryBanner.source && primaryBanner.embedded ? (
            <iframe
              src={primaryBanner.embedded}
              title={primaryBanner.title || 'Advertisement video'}
              allow="autoplay; encrypted-media; picture-in-picture"
              allowFullScreen
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }}
            />
          ) : null}
          {normalizedBanners.length === 1 && primaryBanner.mediaType === 'video' && primaryBanner.source && !primaryBanner.embedded ? (
            <video
              src={primaryBanner.source}
              poster={primaryBanner.thumb || undefined}
              controls
              preload="metadata"
              playsInline
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : null}
          {normalizedBanners.length === 1 && primaryBanner.mediaType === 'text' && primaryBanner.thumb ? (
            <img
              src={primaryBanner.thumb}
              alt={primaryBanner.title || 'Advertisement banner'}
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : null}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(to top, rgba(0,0,0,0.68), rgba(0,0,0,0.2) 45%, rgba(0,0,0,0.1))',
              pointerEvents: 'none',
            }}
            aria-hidden="true"
          />
          <div
            style={{
              position: 'relative',
              zIndex: 1,
              width: '100%',
              paddingLeft: 'clamp(16px, 4vw, 52px)',
              paddingRight: 'clamp(16px, 4vw, 52px)',
              paddingBottom: 28,
            }}
          >
            {normalizedBanners.length === 1 && primaryBanner.title ? (
              <h2 style={{ color: '#fff', margin: 0, fontSize: 'clamp(1.25rem, 2.3vw, 2rem)' }}>{primaryBanner.title}</h2>
            ) : null}
            {normalizedBanners.length === 1 && primaryBanner.content ? (
              <p style={{ color: '#e2e8f0', marginTop: 8, maxWidth: 760, fontSize: 'clamp(0.92rem, 1.4vw, 1.05rem)', lineHeight: 1.55 }}>
                {truncateText(primaryBanner.content, 220)}
              </p>
            ) : null}
          </div>
        </section>
      ) : null}

      <section id="home" className="heroSection">
        <div className="container">
          <div className="heroCardWrap">
            <div className="heroGrid">
              <div className="heroCopy">
              {/* <div className="pill">Reliable. Sustainable. Built to last.</div>  */}
                <h1 className="heroTitle">Professional Plumbing, Sustainable water infrastructures, Equipment rentals, Material supply and Job opportunities.</h1>
                <div className="heroLead">
               
                  <p>
                    We specialize in the design, installation, and maintenance of high-quality plumbing and water infrastructure systems
                    tailored to meet residential, commercial, and industrial needs. Our expertise ensures long-lasting performance,
                    water efficiency, and system reliability.
                  </p>
                  <p>
                    Beyond installation, we support your projects end-to-end with equipment rental services, quality material supply,
                    and skilled workforce placement, connecting the right people with the right opportunities.
                  </p>
                  <p style={{ fontWeight: "bold" }}>Your trusted partner</p>
                </div>

                <div className="ctaRow">
                  <Link className="btn btnBlue" to="/request-quotes">
                    Request a Quote
                  </Link>
                  <Link className="btn btnGreen" to="/auth?next=%2Femployer%2Fpost-job">
                    Post a Job
                  </Link>
                  <Link className="btn btnBlue" to="/rent-equipment">
                    Rent Equipment
                  </Link>
                  <Link className="btn btnOutline" to="/jobs">
                    Find a Job
                  </Link>
                </div>
              </div>

              <div className="heroMedia">
                <div className="heroImageCard">
                  <img className="heroImage" src={heroImg} alt="Plumbing and water infrastructure" />
                  <div className="heroGlow" aria-hidden="true" />
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      <section id="services" className="section sectionServices serviceHexSection">
        <div className="container">
          <div className="sectionHead">
            <h2 className="sectionTitle">Our Services</h2>
            <p className="sectionSubtitle">Five core services delivered with technical excellence and fast response.</p>
          </div>

          <div className="serviceHexGrid">
            {services.map((s) => (
              <div key={s.title} className="serviceHexCard">
                <div className="serviceHexFrame">
                  <div className="serviceHexInner">
                    <img className="serviceHexImg" src={SERVICE_IMAGE[s.imageKey]} alt={s.title} />
                  </div>
                </div>
                <div className="serviceHexTitleBand">
                  <h3 className="serviceHexTitle">{s.title}</h3>
                  <p className="serviceHexBlurb">{s.description}</p>
                </div>
              </div>
            ))}
          </div>

          {/*<div className="projectsNote" style={{ marginTop: 18 }}>
            Explore all services and engineering support on the <Link to="/services">Services page</Link>.
          </div>*/}

        </div>
      </section>

      <section id="why" className="section sectionWhy">
        <div className="container whyGrid">
          <div className="whyIntroCol">
            <h2 className="sectionTitle">Mission</h2>
            <p className="sectionSubtitle">
            To deliver reliable, sustainable, and cost-effective plumbing and water system solutions through quality engineering, modern technology, and skilled professionals,
             while supporting infrastructure development and creating employment opportunities in Rwanda.
            </p>
            <div className="whyIntroImageWrap">
            <h2 className="sectionTitle">Vision</h2>
            <p className="sectionSubtitle">
            To become a leading and trusted engineering company in
             Rwanda and across the region, recognized for
              delivering innovative, sustainable, and high-quality water system and Constructions solutions. We aim to drive infrastructure development, improve access to efficient water services, empower communities through employment opportunities, and 
            continuously embrace modern technologies to shape a better and more sustainable future.
            </p>
            </div>
          </div>

          <div className="whyCards">
            <h2 className="sectionTitle">Our Strengths</h2>
            {[
              { title: 'Experienced Water Engineers', desc: "Built for Rwanda's real-world infrastructure and water management needs." },
              { title: 'Professional Design Tools', desc: ' Revit MEP , AutoCAD, ArchiCAD, GIS and watergerm workflows.' },
              { title: 'Reliable Equipment', desc: 'We provide Equipment rentals and materials  Supply service.' },
              { title: 'Fast Response Team', desc: 'Clear timelines, quick services and Effective communication' },
              { title: 'Fair Pricing', desc: 'We provide services at a reasonable cost.' },
            ].map((w) => (
              <div key={w.title} className="whyCard">
                <div className="whyCheck">{'\u2714'}</div>
                <div>
                  <h3 className="whyTitle">{w.title}</h3>
                  <p className="whyDesc">{w.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="projects" className="section sectionProjects homeProjectsSection">
        <div className="container">
          <div className="sectionHead">
            <h2 className="sectionTitle">Projects</h2>
            <p className="sectionSubtitle">Recent installations and infrastructure delivered across Rwanda.</p>
            {projects.length > 3 ? <p className="homeProjectsHint">Showing 3 of {projects.length} projects</p> : null}
          </div>

          {projects.length === 0 ? (
            <div className="homeProjectsEmpty">
              <p>No projects published yet. When projects are added to the system, they will appear here.</p>
              <Link className="btn btnOutline btnSm" to="/contact">
                Get in touch
              </Link>
            </div>
          ) : (
            <>
              <div className="homeProjectsGrid">
                {projects.slice(0, 3).map((p) => {
                  const img = resolveMediaUrl(p.image)
                  return (
                    <article key={p.project_id} className="homeProjectCard">
                      <div className="homeProjectImageWrap">
                        <img className="homeProjectImage" src={img || heroImg} alt={p.title || 'Project'} loading="lazy" />
                      </div>
                      <div className="homeProjectBody">
                        <h3 className="homeProjectTitle">{p.title}</h3>
                        {p.description ? <p className="homeProjectDesc">{truncateText(p.description, 130)}</p> : null}
                        <div className="homeProjectMeta">
                          {p.location ? (
                            <div className="homeProjectMetaLine">
                              <span className="homeProjectMetaKey">Location</span>
                              <span className="homeProjectMetaVal">{p.location}</span>
                            </div>
                          ) : null}
                          {p.completion_date ? (
                            <div className="homeProjectMetaLine">
                              <span className="homeProjectMetaKey">Completed</span>
                              <span className="homeProjectMetaVal">{formatProjectDate(p.completion_date)}</span>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </article>
                  )
                })}
              </div>

              <div className="homeProjectsFooter">
                <Link className="homeProjectsViewMore" to="/projects">
                  View more
                </Link>
              </div>
            </>
          )}
        </div>
      </section>
    </main>
  )
}

