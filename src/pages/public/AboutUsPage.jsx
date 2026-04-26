import { Link } from 'react-router-dom'

export default function AboutUsPage() {
  return (
    <div className="container" style={{ paddingTop: 28, paddingBottom: 60 }}>
      <div className="sectionHead" style={{ textAlign: 'left' }}>
        <h2 className="sectionTitle">About Verde Rwanda Ltd</h2>
        <p className="sectionSubtitle" style={{ marginLeft: 0, marginRight: 0 }}>
          Professional plumbing & water systems with reliable, sustainable, and cost-effective solutions across Rwanda.
        </p>
      </div>

      <div className="dashGrid2" style={{ marginTop: 12 }}>
        <div className="dashCard">
          <div className="dashTitle">Who we are</div>
          <div className="dashSubtle" style={{ marginTop: 6, fontSize: 14, lineHeight: 1.7 }}>
            Verde Rwanda Ltd is a professional plumbing and water systems company dedicated to delivering reliable, sustainable, and
            cost-effective solutions across Rwanda. We specialize in plumbing design, installation, maintenance, and advanced water system
            engineering for residential, commercial, and institutional projects.
            <br />
            <br />
            Our services extend beyond plumbing. We provide complete water supply system solutions including design, Constructions, and
            supervision of distribution networks, pumping systems, and storage infrastructure.
            <br />
            <br />
            In addition, Verde Rwanda offers Constructions and plumbing equipment rentals and a dynamic employment platform connecting
            skilled job seekers with employers in Different fields.
            <br />
            <br />
            With a commitment to technical excellence, innovation, and customer satisfaction, we aim to contribute to sustainable water
            management solutions and infrastructure development in Rwanda.
          </div>

          <div className="aboutWhoCta">
            <Link className="btn btnBlue" to="/request-quotes">
              Request a Quote
            </Link>
            <Link className="btn btnGreen" to="/rent-equipment">
              Rent Equipment
            </Link>
          </div>
        </div>

        <div className="dashCard">
          <div className="dashTitle">What we do</div>
          <div className="dashSubtle" style={{ marginTop: 6 }}>
            A complete set of services for plumbing, water systems, equipment rental, and employment opportunities.
          </div>

          <div className="dashList" style={{ marginTop: 12 }}>
            {[
              { title: 'Plumbing solutions', bullets: ['Design', 'Installation', 'Maintenance'] },
              { title: 'Employment opportunities', bullets: ['Job seekers', 'Job givers'] },
              { title: 'Equipment rentals', bullets: ['Constructions equipment', 'Plumbing equipment'] },
              { title: 'Water system solutions and Maintenance', bullets: ['Design', 'Constructions', 'Supervision'] },
            ].map((s) => (
              <div key={s.title} className="dashItem">
                <div className="dashItemTitle">{s.title}</div>
                <div className="dashItemMeta">
                  {s.bullets.map((b) => (
                    <span key={b} className="statusPill blue">
                      <span className="statusDot" aria-hidden="true" />
                      {b}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

