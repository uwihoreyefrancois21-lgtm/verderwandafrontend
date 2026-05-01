export default function ContactPage() {
  const contact = {
    phone: '+250788599614/0799512923',
    email: 'verderwanda@gmail.com',
    address: 'Kicukiro, Kicukiro,  Kigali City, RWANDA',
  }
  const hours = [
    { label: 'Monday – Saturday', value: '08:00 AM – 5:00 PM' },
    { label: 'Sunday & Holidays', value: 'Closed' },
    { label: '', value: '' },
  ]

  return (
    <div className="container" style={{ paddingTop: 28, paddingBottom: 60 }}>
      <div className="sectionHead" style={{ textAlign: 'left' }}>
      <h2 
  className="sectionTitle" 
  style={{ textAlign: 'left', color: 'blue' }}
>
  Contact Us
</h2>

       
        <p className="sectiontitle">
        Get in Touch : We’re here to support your plumbing, water systems, and construction needs. Contact Verde Rwanda Ltd for reliable and professional services</p>      
      </div>

      <div className="dashGrid2 contactPageGrid" style={{ marginTop: 12 }}>
        <div className="dashCard">
          <div className="contactBox">
            <div className="contactRow">
              <div className="contactLabel">Phone</div>
              <a className="contactValue" href={`tel:${contact.phone}`}>
                {contact.phone}
              </a>
            </div>
            <div className="contactRow">
              <div className="contactLabel">Email</div>
              <a className="contactValue" href={`mailto:${contact.email}`}>
                {contact.email}
              </a>
            </div>
            <div className="contactRow">
              <div className="contactLabel">WhatsApp</div>
              <a className="contactValue" href="https://wa.me/250799512923" target="_blank" rel="noreferrer">
                Chat now
              </a>
            </div>
            <div className="contactRow">
              <div className="contactLabel">Office location</div>
              <div className="contactValue">{contact.address}</div>
            </div>
          </div>
       

          <div className="contactHours">
            <div className="contactHoursTitle">Working hours</div>
            <div className="contactHoursBox">
              {hours.map((h) => (
                <div key={h.label} className="contactRow">
                  <div className="contactLabel">{h.label}</div>
                  <div className="contactValue">{h.value}</div>
                </div>
              ))}
            </div>
            <p className="sectionSubtitle">Call us, email us, or start a WhatsApp chat.</p>
        <p className="sectionSubtitle contactPageFooterHint" style={{ marginTop: 10 }}>
          To send a written message, use <a href="#footer-contact-form">Send a message</a> 
        </p>
          </div>
        </div>

        <div className="mapCard">
          <div className="mapTitle">Our Location</div>
          <div className="mapFrameWrap">
            <iframe
              title="Verde Rwanda location map"
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3987.366554272768!2d30.096379874487624!3d-2.0087358368414603!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x19dca6262f5e285b%3A0x29563196d611ebf4!2sKK%2015%20Rd%2C%20Kigali!5e0!3m2!1sen!2srw!4v1773989385653!5m2!1sen!2srw"
              width="600"
              height="450"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
