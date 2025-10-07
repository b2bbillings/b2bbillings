import React, { useState } from 'react';
import { Card, Row, Col, Table, Badge, Tabs, Tab, Alert, Container, Form, Button } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faBuilding, 
  faInfoCircle, 
  faUsers, 
  faChartLine,
  faGlobe,
  faIndustry,
  faCertificate,
  faMapMarkerAlt,
  faPhone,
  faEnvelope,
  faCalendarAlt,
  faTags,
  faAward,
  faBullseye,
  faRocket,
  faHandshake,
  faLightbulb,
  faShield,
  faFileInvoice
} from '@fortawesome/free-solid-svg-icons';
import './CompanyBrandInfo.css';

const CompanyBrandInfo = () => {
  const [activeTab, setActiveTab] = useState('overview');

  // Sample company data - this would typically come from props or API
  const companyData = {
    basic: {
      name: 'B2B Billings Solutions',
      tagline: 'Streamlining Business Operations',
      founded: '2024',
      type: 'Technology Solutions',
      employees: '10-50',
      headquarters: 'India',
      website: 'www.b2bbillings.com',
      email: 'info@b2bbillings.com',
      phone: '+91-XXXX-XXXXXX'
    },
    brand: {
      mission: 'To simplify and streamline business operations through innovative billing and management solutions.',
      vision: 'To become the leading platform for small and medium businesses to manage their operations efficiently.',
      values: [
        { icon: faLightbulb, title: 'Innovation', description: 'Continuously evolving our solutions' },
        { icon: faShield, title: 'Reliability', description: 'Dependable service you can trust' },
        { icon: faHandshake, title: 'Partnership', description: 'Building lasting relationships' },
        { icon: faRocket, title: 'Growth', description: 'Enabling business growth' }
      ],
      colors: {
        primary: '#0d6efd',
        secondary: '#6c757d',
        success: '#198754',
        warning: '#ffc107',
        danger: '#dc3545'
      }
    },
    services: [
      {
        category: 'Billing & Invoicing',
        icon: faFileInvoice,
        items: [
          'GST-compliant invoicing',
          'Purchase bill management',
          'Quotation generation',
          'Payment tracking',
          'Tax calculations'
        ]
      },
      {
        category: 'Inventory Management',
        icon: faIndustry,
        items: [
          'Stock tracking',
          'Low stock alerts',
          'Product categorization',
          'Supplier management',
          'Purchase orders'
        ]
      },
      {
        category: 'Business Analytics',
        icon: faChartLine,
        items: [
          'Sales reports',
          'Financial dashboards',
          'Performance metrics',
          'Trend analysis',
          'Custom reports'
        ]
      },
      {
        category: 'Customer Management',
        icon: faUsers,
        items: [
          'Party management',
          'Contact organization',
          'Communication history',
          'Payment terms',
          'Credit management'
        ]
      }
    ],
    achievements: [
      { icon: faAward, title: 'Industry Recognition', description: 'Recognized for innovation in SME solutions' },
      { icon: faCertificate, title: 'Quality Certified', description: 'ISO-compliant development processes' },
      { icon: faUsers, title: 'Customer Satisfaction', description: '98% customer satisfaction rate' },
      { icon: faRocket, title: 'Growth Rate', description: '150% year-over-year growth' }
    ],
    certifications: [
      'GST Compliance Certified',
      'Data Security Compliant',
      'ISO 27001 Standards',
      'GDPR Compliant',
      'Indian Government Approved'
    ],
    timeline: [
      { year: '2024', event: 'Company Founded', description: 'Started with a vision to streamline business operations' },
      { year: '2024 Q2', event: 'MVP Launch', description: 'Released minimum viable product for beta testing' },
      { year: '2024 Q3', event: 'GST Integration', description: 'Full GST compliance and automation features' },
      { year: '2024 Q4', event: 'Advanced Features', description: 'Analytics, reporting, and dashboard enhancements' },
      { year: '2025', event: 'Scale & Growth', description: 'Expanding feature set and user base' }
    ]
  };

  return (
    <Container fluid className="company-brand-container p-4">
      <div className="d-flex align-items-center mb-4">
        <FontAwesomeIcon icon={faBuilding} className="me-3 text-primary" size="2x" />
        <div>
          <h2 className="mb-1">Company Information</h2>
          <p className="text-muted mb-0">Learn about our brand, mission, and services</p>
        </div>
      </div>

      <Tabs
        activeKey={activeTab}
        onSelect={(k) => setActiveTab(k)}
        className="nav-tabs-custom mb-4"
        fill
      >
        <Tab eventKey="overview" title={<><FontAwesomeIcon icon={faBuilding} className="me-2" />Overview</>}>
          <Row>
            <Col lg={8}>
              <Card className="mb-4">
                <Card.Header>
                  <FontAwesomeIcon icon={faInfoCircle} className="me-2" />
                  Company Details
                </Card.Header>
                <Card.Body>
                  <Row>
                    <Col md={6}>
                      <div className="company-info-item mb-3">
                        <strong>Company Name:</strong>
                        <p className="mb-1">{companyData.basic.name}</p>
                      </div>
                      <div className="company-info-item mb-3">
                        <strong>Founded:</strong>
                        <p className="mb-1">{companyData.basic.founded}</p>
                      </div>
                      <div className="company-info-item mb-3">
                        <strong>Business Type:</strong>
                        <p className="mb-1">{companyData.basic.type}</p>
                      </div>
                      <div className="company-info-item mb-3">
                        <strong>Team Size:</strong>
                        <p className="mb-1">{companyData.basic.employees}</p>
                      </div>
                    </Col>
                    <Col md={6}>
                      <div className="company-info-item mb-3">
                        <FontAwesomeIcon icon={faMapMarkerAlt} className="me-2 text-muted" />
                        <strong>Headquarters:</strong>
                        <p className="mb-1">{companyData.basic.headquarters}</p>
                      </div>
                      <div className="company-info-item mb-3">
                        <FontAwesomeIcon icon={faGlobe} className="me-2 text-muted" />
                        <strong>Website:</strong>
                        <p className="mb-1">{companyData.basic.website}</p>
                      </div>
                      <div className="company-info-item mb-3">
                        <FontAwesomeIcon icon={faEnvelope} className="me-2 text-muted" />
                        <strong>Email:</strong>
                        <p className="mb-1">{companyData.basic.email}</p>
                      </div>
                      <div className="company-info-item mb-3">
                        <FontAwesomeIcon icon={faPhone} className="me-2 text-muted" />
                        <strong>Phone:</strong>
                        <p className="mb-1">{companyData.basic.phone}</p>
                      </div>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>
            </Col>
            <Col lg={4}>
              <Card className="achievements-card">
                <Card.Header>
                  <FontAwesomeIcon icon={faAward} className="me-2" />
                  Key Achievements
                </Card.Header>
                <Card.Body>
                  {companyData.achievements.map((achievement, idx) => (
                    <div key={idx} className="achievement-item mb-3">
                      <div className="d-flex align-items-start">
                        <FontAwesomeIcon 
                          icon={achievement.icon} 
                          className="me-2 mt-1 text-primary"
                        />
                        <div>
                          <h6 className="mb-1">{achievement.title}</h6>
                          <small className="text-muted">{achievement.description}</small>
                        </div>
                      </div>
                    </div>
                  ))}
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Tab>

        <Tab eventKey="brand" title={<><FontAwesomeIcon icon={faBullseye} className="me-2" />Brand & Mission</>}>
          <Row>
            <Col lg={8}>
              <Card className="mb-4">
                <Card.Header>
                  <FontAwesomeIcon icon={faBullseye} className="me-2" />
                  Mission & Vision
                </Card.Header>
                <Card.Body>
                  <div className="mission-vision-section mb-4">
                    <h5 className="text-primary mb-3">
                      <FontAwesomeIcon icon={faBullseye} className="me-2" />
                      Our Mission
                    </h5>
                    <p className="lead">{companyData.brand.mission}</p>
                  </div>
                  <div className="mission-vision-section">
                    <h5 className="text-success mb-3">
                      <FontAwesomeIcon icon={faRocket} className="me-2" />
                      Our Vision
                    </h5>
                    <p className="lead">{companyData.brand.vision}</p>
                  </div>
                </Card.Body>
              </Card>

              <Card>
                <Card.Header>
                  <FontAwesomeIcon icon={faLightbulb} className="me-2" />
                  Core Values
                </Card.Header>
                <Card.Body>
                  <Row>
                    {companyData.brand.values.map((value, idx) => (
                      <Col md={6} key={idx} className="mb-3">
                        <div className="value-item p-3 h-100">
                          <div className="d-flex align-items-center mb-2">
                            <FontAwesomeIcon 
                              icon={value.icon} 
                              className="me-2 text-primary" 
                              size="lg"
                            />
                            <h6 className="mb-0">{value.title}</h6>
                          </div>
                          <p className="text-muted small mb-0">{value.description}</p>
                        </div>
                      </Col>
                    ))}
                  </Row>
                </Card.Body>
              </Card>
            </Col>
            <Col lg={4}>
              <Card className="brand-colors-card">
                <Card.Header>
                  <FontAwesomeIcon icon={faTags} className="me-2" />
                  Brand Colors
                </Card.Header>
                <Card.Body>
                  {Object.entries(companyData.brand.colors).map(([name, color]) => (
                    <div key={name} className="color-item d-flex align-items-center mb-3">
                      <div 
                        className="color-swatch me-3"
                        style={{ backgroundColor: color }}
                      ></div>
                      <div>
                        <div className="fw-bold text-capitalize">{name}</div>
                        <small className="text-muted">{color}</small>
                      </div>
                    </div>
                  ))}
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Tab>

        <Tab eventKey="services" title={<><FontAwesomeIcon icon={faIndustry} className="me-2" />Services</>}>
          <Row>
            {companyData.services.map((service, idx) => (
              <Col lg={6} key={idx} className="mb-4">
                <Card className="h-100 service-card">
                  <Card.Header className="d-flex align-items-center">
                    <FontAwesomeIcon icon={service.icon} className="me-2" />
                    <span className="fw-bold">{service.category}</span>
                  </Card.Header>
                  <Card.Body>
                    <ul className="service-list list-unstyled">
                      {service.items.map((item, itemIdx) => (
                        <li key={itemIdx} className="service-item mb-2">
                          <FontAwesomeIcon icon={faShield} className="me-2 text-success" size="sm" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </Card.Body>
                </Card>
              </Col>
            ))}
          </Row>
        </Tab>

        <Tab eventKey="timeline" title={<><FontAwesomeIcon icon={faCalendarAlt} className="me-2" />Timeline</>}>
          <Row>
            <Col lg={8}>
              <Card>
                <Card.Header>
                  <FontAwesomeIcon icon={faCalendarAlt} className="me-2" />
                  Company Timeline
                </Card.Header>
                <Card.Body>
                  <div className="timeline">
                    {companyData.timeline.map((milestone, idx) => (
                      <div key={idx} className="timeline-item">
                        <div className="timeline-marker"></div>
                        <div className="timeline-content">
                          <div className="timeline-date">
                            <Badge bg="primary">{milestone.year}</Badge>
                          </div>
                          <h6 className="timeline-title">{milestone.event}</h6>
                          <p className="timeline-description text-muted">
                            {milestone.description}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card.Body>
              </Card>
            </Col>
            <Col lg={4}>
              <Card className="certifications-card">
                <Card.Header>
                  <FontAwesomeIcon icon={faCertificate} className="me-2" />
                  Certifications
                </Card.Header>
                <Card.Body>
                  {companyData.certifications.map((cert, idx) => (
                    <div key={idx} className="certification-item mb-2">
                      <Badge bg="success" className="w-100 text-wrap p-2">
                        <FontAwesomeIcon icon={faCertificate} className="me-2" />
                        {cert}
                      </Badge>
                    </div>
                  ))}
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Tab>
      </Tabs>

      <Alert variant="info" className="mt-4">
        <FontAwesomeIcon icon={faInfoCircle} className="me-2" />
        <strong>Contact Us:</strong> For more information about our company or services, please reach out to us at {companyData.basic.email} or visit our website.
      </Alert>
    </Container>
  );
};

export default CompanyBrandInfo;