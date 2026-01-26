import clsx from 'clsx';
import Heading from '@theme/Heading';
import styles from './styles.module.css';

const FeatureList = [
  {
    title: 'Unlock the Full Potential of Your Data',
    Svg: require('@site/static/img/undraw_docusaurus_mountain.svg').default,
    description: (
      <>
        Write complex queries using MongoDB's aggregation in JSON or JavaScript and easily visualize and analyze your
        data. Enrich your dashboards with query variables, alerting, annotations, etc.
      </>
    ),
  },
  {
    title: 'Query faster with IntelliSense',
    Svg: require('@site/static/img/undraw_docusaurus_tree.svg').default,
    description: (
      <>
        The crafted Monaco-powered editor provides smart auto-completion, hover documentation, syntax highlighting, and
        CodeLens to make writing queries effortless and error-free.
      </>
    ),
  },
  {
    title: 'FOSS for Community',
    Svg: require('@site/static/img/undraw_docusaurus_react.svg').default,
    description: (
      <>
        Free to use and fully open source. Evolves with the development of Grafana and community's needs for modern
        feature support.
      </>
    ),
  },
];

function Feature({ Svg, title, description }) {
  return (
    <div className={clsx('col col--4')}>
      <div className="text--center">
        <Svg className={styles.featureSvg} role="img" />
      </div>
      <div className="text--center padding-horiz--md">
        <Heading as="h3">{title}</Heading>
        <p>{description}</p>
      </div>
    </div>
  );
}

export default function HomepageFeatures() {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}
