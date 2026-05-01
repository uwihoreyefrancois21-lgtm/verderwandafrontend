import { useEffect, useState } from 'react'
import heroImg from '../../assets/hero.png'
import { apiFetch } from '../../services/api'
import { resolveMediaUrl } from '../../utils/mediaUrl'

export default function ProjectsPage() {
  const [projects, setProjects] = useState([])
  const [showAllProjects, setShowAllProjects] = useState(false)
  const INITIAL_VISIBLE_PROJECTS = 6

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const data = await apiFetch('/projects')
        if (!cancelled) setProjects(Array.isArray(data) ? data : [])
      } catch {
        // ignore
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [])

  const finalProjects = projects.length
    ? projects
    : [
       /*  { project_id: 1, title: 'Installed Pipelines', image: heroImg },
        { project_id: 2, title: 'Water Tanks & Storage', image: heroImg },
        { project_id: 3, title: 'Pump Installations', image: heroImg },
        { project_id: 4, title: 'Construction Site Works', image: heroImg },
        { project_id: 5, title: 'Distribution Network Supervision', image: heroImg },
        { project_id: 6, title: 'Water Infrastructure Projects', image: heroImg }, */
      ]

  const visibleProjects = showAllProjects ? finalProjects : finalProjects.slice(0, INITIAL_VISIBLE_PROJECTS)
  const hasMoreProjects = finalProjects.length > INITIAL_VISIBLE_PROJECTS

  return (
    <div className="container" style={{ paddingTop: 28, paddingBottom: 60 }}>
      <div className="sectionHead" style={{ textAlign: 'left' }}>
        <h2 className="sectionTitle">Projects</h2>
        <p className="sectionSubtitle">Installed pipelines, water tanks, pump installations and construction sites.</p>
      </div>

      <div className="projectsGrid" style={{ marginTop: 12 }}>
        {visibleProjects.map((p) => (
          <div key={p.project_id || p.title} className="projectCard">
            <div className="projectImageWrap">
              <img className="projectImage" src={resolveMediaUrl(p.image) || heroImg} alt={p.title || ''} />
            </div>
            <div className="projectMeta">
              <h3 className="projectTitle">{p.title}</h3>
              {p.description ? <p className="projectExcerpt">{String(p.description).replace(/\s+/g, ' ').trim().slice(0, 160)}{String(p.description).length > 160 ? '…' : ''}</p> : null}
              {p.location ? (
                <div className="projectLocLine">
                  <span className="projectLocKey">Location</span>
                  <span className="projectLocVal">{p.location}</span>
                </div>
              ) : null}
              {p.completion_date ? <div className="projectDateLine">Completed {String(p.completion_date).slice(0, 10)}</div> : null}
            </div>
          </div>
        ))}
      </div>

      {!showAllProjects && hasMoreProjects && (
        <div style={{ textAlign: 'center', marginTop: 32 }}>
          <button
            type="button"
            className="btn btnBlue"
            onClick={() => setShowAllProjects(true)}
            style={{ minWidth: 160 }}
          >
            View More
          </button>
        </div>
      )}
    </div>
  )
}

