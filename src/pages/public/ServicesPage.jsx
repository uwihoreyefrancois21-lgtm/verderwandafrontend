import { useState } from 'react';

import equipmentImg from '../../assets/publicserviceimage/service-equipment-rentalsss.jpg';
import jobsImg from '../../assets/publicserviceimage/service-jobs-training-platformn.jpg';
import materialsImg from '../../assets/publicserviceimage/service-material-supply.jpg';
import plumbingImg from '../../assets/publicserviceimage/service-plumbing-water-systems.jpg';
import waterImg from '../../assets/publicserviceimage/service-water-supply-solutions.jpg';

export default function ServicesPage() {
  const [expanded, setExpanded] = useState(null)

  const services = [
    {
      title: 'Plumbing Solutions',
      image: plumbingImg,
      description: 'Expert plumbing services including design, installation, and maintenance for residential and commercial properties. Ensure efficient water systems with our professional team.',
      subServices: ['Design', 'Installation', 'Maintenance'],
    },
    {
      title: 'Employment Opportunities',
      image: jobsImg,
      description: 'Connect job seekers with employers In all fields. Find skilled workers or post job openings for your projects.',
      subServices: ['Find Job', 'Job Posting'],
    },
    {
      title: 'Equipment Rentals',
      image: equipmentImg,
      description: 'Rent high-quality construction and plumbing equipment for your projects. Affordable rates with delivery and pickup services available.',
      subServices: ['Construction Equipment', 'Plumbing Equipment'],
    },
    {
      title: 'Water System Solutions',
      image: waterImg,
      description: 'Comprehensive water system design, construction, and supervision. From planning to execution, we deliver reliable water infrastructure solutions.',
      subServices: ['Design', 'Construction', 'Supervision'],
    },
    {
      title: 'Material Supply',
      image: materialsImg,
      description: 'Supply high-quality water materials for your plumbing and construction needs. Durable products to ensure long-lasting installations.',
      subServices: ['Water Materials'],
    },
  ]

  const handleViewMore = (index) => {
    setExpanded(expanded === index ? null : index)
  }

  return (
    <div className="container" style={{ paddingTop: 28, paddingBottom: 60 }}>
      <div className="sectionHead" style={{ textAlign: 'left' }}>
        <h2 className="sectionTitle">Our Services</h2>
        <p className="sectionSubtitle">Professional engineering support with practical delivery.</p>
      </div>

      <div className="serviceBigGrid" style={{ marginTop: 12 }}>
        {services.map((s, index) => (
          <div key={s.title} className="serviceBigCard" style={{ textDecoration: 'none' }}>
            <div className="serviceBigImageWrap">
              <img className="serviceBigImage" src={s.image} alt={s.title} />
            </div>
            <div className="serviceBigMeta">
              <div className="serviceBigTitle">{s.title}</div>
              <div className="serviceBigDesc">{s.description}</div>
              <div className="serviceBigActions">
                <button className="btn btnOutline btnSm" onClick={() => handleViewMore(index)}>
                  View More
                </button>
              </div>
            </div>
            {expanded === index && (
              <div className="subServices" style={{ marginTop: 16, paddingLeft: 16 }}>
                <ul style={{ listStyleType: 'disc', paddingLeft: 20 }}>
                  {s.subServices.map((sub) => (
                    <li key={sub} style={{ marginBottom: 8, color: '#333' }}>
                      {sub}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

