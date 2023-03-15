'use strict'

const { React, ReactDOM, ReactBootstrap, _: lodash } = window

// CSR
if ([lodash, React, ReactDOM, ReactBootstrap].some((v) => !v)) {
  window.alert('Missing Necessary Dependencies')
} else {
  const rootNode = document.getElementById('root')
  const root = ReactDOM.createRoot(rootNode)
  root.render(<Root />)
}

const { startCase } = lodash
const {
  useState,
  useReducer,
  useContext,
  useEffect,
  useMemo,
  useCallback,
  Fragment,
} = React
const {
  Container,
  Row,
  Col,
  Nav,
  Navbar,
  Accordion,
  Card,
  Badge,
  Spinner,
  Button,
  Form,
} = ReactBootstrap

const deepCopy = (obj) =>
  structuredClone ? structuredClone(obj) : JSON.parse(JSON.stringify(obj))

const URL_HMT_BATCH = 'https://hmtwatches.in/watches'

const KEYS_TYPE = Object.freeze({
  all_watches: 'all_watches_end_id',
  discount_watch: 'discount_watch_end_id',
  new_arrivals_watch: 'new_arrivals_watch_end_id',
  premium_watch: 'premium_watch_end_id',
  top_seller_watch: 'top_seller_watch_end_id',
})

const KEYS_FILTER = Object.freeze({
  collection_filter: 'collection_filter_list',
  dial_color_filter: 'dial_color_filter_list',
  discount_filter: 'discount_filter_list',
  function_filter: 'function_filter_list',
  // gender_filter_list
  // gender_filter_list_new
  // gender_filter_list_old
  gender_filter: 'gender_filter_list',
  // movement_filter_list
  // movement_filter_list_new
  // movement_filter_list_old
  movement_filter: 'movement_filter_list',
  // price_filter_list
  // price_filter_list_all
  // price_filter_list_discount
  // price_filter_list_new
  // price_filter_list_premium_watch
  price_filter: 'price_filter_list',
  strap_color_filter: 'strap_color_filter_list',
  // strap_material_filter_list
  // strap_material_filter_list_new
  // strap_material_filter_list_old
  strap_material_filter: 'strap_material_filter_list',
})

const DEFAULT_FILTER = {
  mode: 'ajax',
  section: 'new_arrivals_watch',
  // last_id: 0
}

async function corsFetch(url, options) {
  const res = await fetch(`https://cors.alwaysdata.net/${url}`, options)
  let data = null
  try {
    data = await res.json()
  } catch (err) {}
  try {
    data = await res.text()
  } catch (err) {}
  return data
}

function sortedObjectKeys(object) {
  return object ? Object.keys(object).sort() : []
}
function sortedObjectValues(object) {
  return object ? Object.values(object).sort() : []
}

const DataContextValue = React.createContext()
const DataContextAction = React.createContext()

const DATA_CONTEXT_ACTIONS = {
  FILTER_ADD: 'FILTER_ADD',
  FILTER_MULTI_ADD: 'FILTER_MULTI_ADD',
  FILTER_REMOVE: 'FILTER_REMOVE',
  FILTER_MULTI_REMOVE: 'FILTER_MULTI_REMOVE',
  FILTER_RESET: 'FILTER_RESET',
  SECTION_SET_TYPES: 'SECTION_SET_TYPES',
  SECTION_UPDATE_TYPES: 'SECTION_UPDATE_TYPES',
  SECTION_SET_FILTERS: 'SECTION_SET_FILTERS',
  SECTION_UPDATE_FILTERS: 'SECTION_UPDATE_FILTERS',
  SECTION_SET_ENTRIES: 'SECTION_SET_ENTRIES',
  SECTION_UPDATE_ENTRIES: 'SECTION_UPDATE_ENTRIES',
  SECTION_RESET: 'SECTION_RESET',
  RAW_SET: 'RAW_SET',
  RAW_UPDATE: 'RAW_UPDATE',
  LOADING_SET: 'LOADING_SET',
  LOADING_RESET: 'LOADING_RESET',
}

async function getHmtData({ filter = {}, filterMulti = {} } = {}) {
  // TODO: Cancellable
  const bodyArray = []
  Object.entries(filter).forEach(([fKey, fValue]) => {
    const prefix = encodeURIComponent(fKey)
    const postfix = encodeURIComponent(fValue)
    bodyArray.push(`${prefix}=${postfix}`)
  })
  Object.entries(filterMulti).forEach(([fKey, fValue]) => {
    fValue.forEach((fItem) => {
      const prefix = encodeURIComponent(`arrStr[${fKey}][]`)
      const postfix = encodeURIComponent(`${fItem}`)
      bodyArray.push(`${prefix}=${postfix}`)
    })
  })
  const body = bodyArray.join('&')
  const data = await corsFetch(URL_HMT_BATCH, {
    method: 'post',
    headers: {
      'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
    },
    body: body,
  })
  const hmtData = {
    sectionFilters: {},
    sectionTypes: {},
    sectionEntries: {},
  }
  Object.entries(KEYS_FILTER).forEach(([destFilterKey, sourceFilterKey]) => {
    hmtData.sectionFilters[destFilterKey] = (data[sourceFilterKey] || []).map(
      ({
        id,
        code,
        status,
        name,
        title,
        dial_color: dialColorName,
        discount: discountName,
        function: functionName,
        gender: genderName,
        movement: movementName,
        strap_material: strapName,
        count,
        discount_count: discountCount,
        product_count: productCount,
        start_price: startPrice,
        end_price: endPrice,
      }) => ({
        id,
        code,
        name:
          name ||
          title ||
          dialColorName ||
          discountName ||
          functionName ||
          genderName ||
          movementName ||
          strapName ||
          `${startPrice} - ${endPrice}` ||
          '',
        count: count || discountCount || productCount || 0,
        status: String(status) === '1',
      })
    )
  })
  Object.entries(KEYS_TYPE).forEach(([typeKey, typeLastIdKey]) => {
    hmtData.sectionTypes[typeKey] = data[typeLastIdKey]
    hmtData.sectionEntries[typeKey] = data[typeKey]
  })
  return hmtData
}

const dataContextReducer = (prevData, { action, value } = {}) => {
  let nextData = deepCopy(prevData)
  const {
    isLoading = false,
    filter = {},
    filterMulti = {},
    section = '',
    sectionTypes = {},
    sectionFilters = {},
    sectionEntries = {},
  } = nextData || {}
  const { key: valueKey, value: valueValue } = value || {}
  switch (action) {
    case DATA_CONTEXT_ACTIONS.LOADING_SET:
      nextData.isLoading = true
      break
    case DATA_CONTEXT_ACTIONS.LOADING_RESET:
      nextData.isLoading = false
      break
    case DATA_CONTEXT_ACTIONS.FILTER_ADD:
      nextData.filter = nextData.filter || {}
      nextData.filter[value.key] = value.value
      break
    case DATA_CONTEXT_ACTIONS.FILTER_MULTI_ADD:
      nextData.filterMulti = nextData.filterMulti || {}
      nextData.filterMulti[value.key] = nextData.filterMulti[value.key] || []
      nextData.filterMulti[value.key].push(value.value)
      break
    case DATA_CONTEXT_ACTIONS.FILTER_REMOVE:
      nextData.filter = nextData.filter || {}
      delete nextData.filter[value.key]
      break
    case DATA_CONTEXT_ACTIONS.FILTER_MULTI_REMOVE:
      nextData.filterMulti = nextData.filterMulti || {}
      nextData.filterMulti[value.key] = nextData.filterMulti[value.key] || []
      nextData.filterMulti[value.key].splice(
        nextData.filterMulti[value.key].findIndex(
          (item) => item === value.value
        ),
        1
      )
      break
    case DATA_CONTEXT_ACTIONS.FILTER_RESET:
      nextData.filter = { ...DEFAULT_FILTER }
      nextData.filterMulti = {}
      break
    case DATA_CONTEXT_ACTIONS.SECTION_SET_TYPES:
      nextData.section = value.value
      break
    case DATA_CONTEXT_ACTIONS.SECTION_UPDATE_TYPES:
      nextData.sectionTypes = nextData.sectionTypes || {}
      nextData.sectionTypes[value.key] = value.value
      break
    case DATA_CONTEXT_ACTIONS.SECTION_SET_FILTERS:
      nextData.sectionLastId = value.value
      break
    case DATA_CONTEXT_ACTIONS.SECTION_UPDATE_FILTERS:
      break
    case DATA_CONTEXT_ACTIONS.SECTION_SET_ENTRIES:
      nextData.sectionEntries = value.value
      break
    case DATA_CONTEXT_ACTIONS.SECTION_UPDATE_ENTRIES:
      nextData.sectionEntries = nextData.sectionEntries || {}
      nextData.sectionEntries[value.key] = (
        nextData.sectionEntries[value.key] || []
      ).concat(value.value)
      break
    case DATA_CONTEXT_ACTIONS.SECTION_RESET:
      nextData.section = ''
      nextData.sectionLastId = -1
      nextData.sectionEntries = []
      break
    case DATA_CONTEXT_ACTIONS.RAW_SET:
      nextData = value.value
      break
    case DATA_CONTEXT_ACTIONS.RAW_UPDATE:
      nextData = Object.assign(nextData, value.value)
      break
    default:
      break
  }
  return nextData
}

function Root() {
  const [data, updateData] = useReducer(dataContextReducer, {
    isLoading: false,
    filter: {
      ...DEFAULT_FILTER,
    },
    filterMulti: {},
    sectionTypes: {},
    sectionFilters: {},
    sectionEntries: {},
  })
  useEffect(() => {
    let isStale = false
    const loadEventListener = () => {
      if (isStale) {
        return
      }
      updateData({ action: DATA_CONTEXT_ACTIONS.LOADING_SET })
      getHmtData({
        filter: {
          mode: DEFAULT_FILTER.mode,
        },
        filterMulti: data.filterMulti,
      })
        .then(({ sectionFilters, sectionTypes, sectionEntries }) => {
          updateData({
            action: DATA_CONTEXT_ACTIONS.RAW_SET,
            value: {
              value: {
                filter: {
                  ...DEFAULT_FILTER,
                },
                filterMulti: {},
                sectionFilters,
                sectionTypes,
                sectionEntries,
              },
            },
          })
        })
        .then(() => {
          // window.alert('Loaded Application')
        })
        .catch((err) => {
          window.alert(`Something went wrong. ${err.message}`)
        })
        .finally(() => {
          updateData({ action: DATA_CONTEXT_ACTIONS.LOADING_RESET })
        })
    }
    window.addEventListener('load', loadEventListener)
    return () => {
      isStale = true
      window.removeEventListener('load', loadEventListener)
    }
  }, [])
  return (
    <DataContextAction.Provider value={updateData}>
      <DataContextValue.Provider value={data}>
        <InitLoader hidden={!data.isLoading} />
        <App />
      </DataContextValue.Provider>
    </DataContextAction.Provider>
  )
}

function App() {
  return (
    <Container>
      <Row className='py-1 px-3 rounded-bottom bg-dark'>
        <Col>
          <HeaderComponent />
        </Col>
      </Row>
      <Row className='my-3 min-vh-100'>
        <Col className='d-none d-md-block' md={3}>
          <AsideComponent />
        </Col>
        <Col sm={12} md={9} className='py-2 border rounded'>
          <Row>
            <Col>
              <NavComponent />
            </Col>
          </Row>
          <Row>
            <Col className='py-3'>
              <MainComponent />
            </Col>
          </Row>
        </Col>
      </Row>
      <Row className='py-3 rounded-top bg-dark text-light'>
        <Col>
          <FooterComponent />
        </Col>
      </Row>
    </Container>
  )
}

function HeaderComponent() {
  return (
    <Navbar variant='dark' bg='dark' expand='lg'>
      <Navbar.Brand href='/'>
        <img
          src='./favicon-32x32.png'
          width='32'
          height='32'
          className='d-inline-block align-top'
          alt='HMT Watch'
        />
        <span className='ms-1'>HMT Watch</span>
      </Navbar.Brand>
    </Navbar>
  )
}

function NavComponent() {
  const dataAction = useContext(DataContextAction)
  const dataValue = useContext(DataContextValue)
  const { filter = {}, sectionTypes = {} } = dataValue || {}
  return (
    <Nav
      as='nav'
      variant='tabs'
      activeKey={filter.section}
      className='justify-content-end'
    >
      {Object.keys(sectionTypes)
        .sort()
        .map((sectionType) => {
          return (
            <Nav.Item key={sectionType}>
              <Nav.Link
                eventKey={sectionType}
                disabled={filter.section === sectionType}
                onClick={() => {
                  dataAction({
                    action: DATA_CONTEXT_ACTIONS.FILTER_ADD,
                    value: {
                      key: 'section',
                      value: sectionType,
                    },
                  })
                }}
              >
                {startCase(sectionType)}
              </Nav.Link>
            </Nav.Item>
          )
        })}
    </Nav>
  )
}

function AsideComponent() {
  const dataAction = useContext(DataContextAction)
  const dataValue = useContext(DataContextValue)

  const { filterMulti = {}, sectionFilters = {} } = dataValue || {}

  const onChangeCb = (e) => {
    const { name, value, checked } = e.target
    dataAction({
      action: checked
        ? DATA_CONTEXT_ACTIONS.FILTER_MULTI_ADD
        : DATA_CONTEXT_ACTIONS.FILTER_MULTI_REMOVE,
      value: {
        key: name,
        value: value,
      },
    })
  }

  const onApplyCb = () => {
    dataAction({ action: DATA_CONTEXT_ACTIONS.LOADING_SET })
    getHmtData({
      filter: {
        mode: DEFAULT_FILTER.mode,
      },
      filterMulti: filterMulti,
    })
      .then(({ sectionFilters, sectionTypes, sectionEntries }) => {
        dataAction({
          action: DATA_CONTEXT_ACTIONS.RAW_SET,
          value: {
            value: {
              filter: {
                ...DEFAULT_FILTER,
              },
              filterMulti: filterMulti,
              sectionFilters,
              sectionTypes,
              sectionEntries,
            },
          },
        })
      })
      .then(() => {
        // window.alert('Filter Applied.')
      })
      .catch((err) => {
        window.alert(`Something went wrong. ${err.message}`)
      })
      .finally(() => {
        dataAction({ action: DATA_CONTEXT_ACTIONS.LOADING_RESET })
      })
  }

  return (
    <aside className='dummy'>
      <Row className='my-3'>
        <Col>Filter By</Col>
        <Col xs='auto'>
          <Button variant='outline-primary' size='sm' onClick={onApplyCb}>
            Apply
          </Button>
        </Col>
      </Row>
      <Row>
        <Col>
          <Form onChange={onChangeCb}>
            <Accordion>
              {Object.entries(sectionFilters).map(
                ([sectionFilterKey, sectionFilterData = []]) => {
                  return (
                    <Accordion.Item
                      key={sectionFilterKey}
                      eventKey={sectionFilterKey}
                    >
                      <Accordion.Header>
                        {startCase(sectionFilterKey)}
                      </Accordion.Header>
                      <Accordion.Body>
                        {(sectionFilterData || []).map(
                          ({ id, code, name, count, status }) => {
                            return (
                              <Form.Check
                                key={id}
                                type='checkbox'
                                id={`${sectionFilterKey}-${id}`}
                                name={sectionFilterKey}
                                value={id}
                                label={`${name} (${count})`}
                                defaultChecked={(
                                  filterMulti[sectionFilterKey] || []
                                ).includes(id)}
                              />
                            )
                          }
                        )}
                      </Accordion.Body>
                    </Accordion.Item>
                  )
                }
              )}
            </Accordion>
          </Form>
        </Col>
      </Row>
    </aside>
  )
}

function MainComponent() {
  const dataValue = useContext(DataContextValue)
  const dataAction = useContext(DataContextAction)

  const { filter = {}, sectionEntries = {}, sectionTypes } = dataValue || {}
  const { section } = filter || {}
  const sectionLastId = sectionTypes[section]
  const filterSectionEntries = sectionEntries[section] || []

  const onLoadCb = () => {
    dataAction({ action: DATA_CONTEXT_ACTIONS.LOADING_SET })
    getHmtData({
      filter: {
        mode: DEFAULT_FILTER.mode,
        section: section,
        last_id: sectionLastId,
      },
      filterMulti: dataValue.filterMulti,
    })
      .then(({ sectionTypes, sectionEntries }) => {
        dataAction({
          action: DATA_CONTEXT_ACTIONS.SECTION_UPDATE_ENTRIES,
          value: {
            key: section,
            value: sectionEntries[section],
          },
        })
        dataAction({
          action: DATA_CONTEXT_ACTIONS.SECTION_UPDATE_TYPES,
          value: {
            key: section,
            value: sectionTypes[section],
          },
        })
      })
      .then(() => {
        // window.alert('Loaded More.')
      })
      .catch((err) => {
        window.alert(`Something went wrong. ${err.message}`)
      })
      .finally(() => {
        dataAction({ action: DATA_CONTEXT_ACTIONS.LOADING_RESET })
      })
  }

  return (
    <main>
      <Row xs={1} sm={2} md={3} xxl={4} className='g-3'>
        {filterSectionEntries.map(
          (
            {
              id,
              prodId,
              product_title: title,
              product_Description: description,
              product_image: image,
              product_price: price,
              quantity,
              in_stock: inStock,
              discount,
            },
            index
          ) => {
            const isAvailable = ['1', 'yes'].includes(
              String(inStock).toLowerCase()
            )
            const keyId = id // `${section}-${id}-${index}`
            return (
              <Col
                key={keyId}
                as='a'
                id={keyId}
                target='_blank'
                href={`https://hmtwatches.in/product_details?id=${prodId}`}
                className={
                  isAvailable
                    ? 'text-decoration-none'
                    : 'text-decoration-line-through'
                }
              >
                <Card
                  bg='white'
                  text='dark'
                  border='light'
                  className='blur hover'
                >
                  <Card.Img
                    variant='top'
                    loading='lazy'
                    src={`//wsrv.nl/?url=${image}&w=256&h=256&l=9&q=100`}
                    alt={title}
                    height='256'
                    width='256'
                    className='bg-light object-fit-cover'
                  />
                  <Card.ImgOverlay className='text-end'>
                    <Badge bg='warning' className='bg-opacity-50'>
                      x{quantity}
                    </Badge>
                  </Card.ImgOverlay>
                  <Card.Body>
                    <Card.Text className='m-0'>{title}</Card.Text>
                    <Card.Text className='m-0 small'>
                      Rs. {price} -({discount}%)
                    </Card.Text>
                  </Card.Body>
                </Card>
              </Col>
            )
          }
        )}
      </Row>
      <Row>
        <Col>
          {filterSectionEntries.length ? (
            <Button
              // disabled={
              //   filterSectionEntries[filterSectionEntries.length - 1].id ===
              //   sectionLastId
              // }
              variant='secondary'
              size='lg'
              className='mt-3 w-100'
              onClick={onLoadCb}
            >
              Load More
            </Button>
          ) : null}
        </Col>
      </Row>
    </main>
  )
}

function FooterComponent() {
  return (
    <footer>
      <Row>
        <Col>
          <a
            href='https://github.com/bhavyasaggi/hmt-watch'
            target='_blank'
            className='d-block lead text-light text-center text-decoration-none'
          >
            Open-Sourced
          </a>
        </Col>
      </Row>
      <Row>
        <Col>
          <div className='d-block text-secondary text-center'>
            This portal is in no way related to the{' '}
            <a
              href='https://hmtwatches.in'
              target='blank'
              className='text-light text-decoration-none'
            >
              Official HMT website.
            </a>
          </div>
        </Col>
      </Row>
    </footer>
  )
}

function InitLoader({ hidden = false }) {
  return (
    <Container
      fluid
      hidden={hidden}
      className={
        'vh-100 position-fixed top-0 start-0 d-grid align-items-center text-center bg-white bg-opacity-75' +
        (hidden ? ' d-none' : ' d-block')
      }
      style={{ zIndex: 99 }}
    >
      <div>
        <svg
          xmlns='http://www.w3.org/2000/svg'
          width='100px'
          height='100px'
          viewBox='0 0 100 100'
          preserveAspectRatio='xMidYMid'
        >
          <g transform='translate(50 50)'>
            <g ng-attr-transform='scale(0.8)'>
              <g transform='translate(-50 -50)'>
                <path
                  fill='#456caa'
                  stroke='#456caa'
                  strokeWidth='0'
                  d='M50,14c19.85,0,36,16.15,36,36S69.85,86,50,86S14,69.85,14,50S30.15,14,50,14 M50,10c-22.091,0-40,17.909-40,40 s17.909,40,40,40s40-17.909,40-40S72.091,10,50,10L50,10z'
                ></path>
                <path
                  fill='#c2d2ee'
                  d='M52.78,42.506c-0.247-0.092-0.415-0.329-0.428-0.603L52.269,40l-0.931-21.225C51.304,18.06,50.716,17.5,50,17.5 s-1.303,0.56-1.338,1.277L47.731,40l-0.083,1.901c-0.013,0.276-0.181,0.513-0.428,0.604c-0.075,0.028-0.146,0.063-0.22,0.093V44h6 v-1.392C52.925,42.577,52.857,42.535,52.78,42.506z'
                >
                  <animateTransform
                    attributeName='transform'
                    type='rotate'
                    repeatCount='indefinite'
                    values='0 50 50;360 50 50'
                    keyTimes='0;1'
                    dur='0.4166666666666667s'
                  ></animateTransform>
                </path>
                <path
                  fill='#88a2ce'
                  d='M58.001,48.362c-0.634-3.244-3.251-5.812-6.514-6.391c-3.846-0.681-7.565,1.35-9.034,4.941 c-0.176,0.432-0.564,0.717-1.013,0.744l-15.149,0.97c-0.72,0.043-1.285,0.642-1.285,1.383c0,0.722,0.564,1.321,1.283,1.363 l15.153,0.971c0.447,0.027,0.834,0.312,1.011,0.744c1.261,3.081,4.223,5.073,7.547,5.073c2.447,0,4.744-1.084,6.301-2.975 C57.858,53.296,58.478,50.808,58.001,48.362z M50,53.06c-1.688,0-3.06-1.373-3.06-3.06s1.373-3.06,3.06-3.06s3.06,1.373,3.06,3.06 S51.688,53.06,50,53.06z'
                >
                  <animateTransform
                    attributeName='transform'
                    type='rotate'
                    repeatCount='indefinite'
                    values='0 50 50;360 50 50'
                    keyTimes='0;1'
                    dur='1.6666666666666667s'
                  ></animateTransform>
                </path>
              </g>
            </g>
          </g>
        </svg>
        <hr />
        Loading Data...
      </div>
    </Container>
  )
}
