'use strict'

const { React, ReactDOM, ReactBootstrap } = window
const {
  useState,
  useReducer,
  useContext,
  useEffect,
  useMemo,
  useCallback,
  Fragment,
} = React
const { Container, Row, Col, Nav, Accordion, Card, Badge, Button, Form } =
  ReactBootstrap

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
  collection: 'collection_filter_list',
  dial_color: 'dial_color_filter_list',
  discount: 'discount_filter_list',
  function: 'function_filter_list',
  // gender_filter_list
  // gender_filter_list_new
  // gender_filter_list_old
  gender: 'gender_filter_list',
  // movement_filter_list
  // movement_filter_list_new
  // movement_filter_list_old
  movement: 'movement_filter_list',
  // price_filter_list
  // price_filter_list_all
  // price_filter_list_discount
  // price_filter_list_new
  // price_filter_list_premium_watch
  price: 'price_filter_list',
  strap_color: 'strap_color_filter_list',
  // strap_material_filter_list
  // strap_material_filter_list_new
  // strap_material_filter_list_old
  strap_material: 'strap_material_filter_list',
})

const DEFAULT_FILTER = {
  mode: 'ajax',
  section: 'new_arrivals_watch',
  // last_id: 0
}

async function corsFetch(url, options) {
  const encodedUrl = encodeURIComponent(url)
  const res = await fetch(`https://cors.alwaysdata.net/?${encodedUrl}`, options)
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

async function getHmtData({ filter = {}, filterMulti = {} } = {}) {
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

const DataContextValue = React.createContext()
const DataContextAction = React.createContext()

const DATA_CONTEXT_ACTIONS = {
  FILTER_ADD: 'FILTER_ADD',
  FILTER_MULTI_ADD: 'FILTER_MULTI_ADD',
  FILTER_REMOVE: 'FILTER_REMOVE',
  FILTER_MULTI_REMOVE: 'FILTER_MULTI_REMOVE',
  FILTER_RESET: 'FILTER_RESET',
  SECTION_SET_TYPES: 'SECTION_SET_TYPES',
  SECTION_SET_FILTERS: 'SECTION_SET_FILTERS',
  SECTION_SET_ENTRIES: 'SECTION_SET_ENTRIES',
  SECTION_UPDATE_ENTRIES: 'SECTION_UPDATE_ENTRIES',
  SECTION_RESET: 'SECTION_RESET',
  RAW_SET: 'RAW_SET',
  RAW_UPDATE: 'RAW_UPDATE',
}

const dataContextReducer = (prevData, { action, value } = {}) => {
  let nextData = deepCopy(prevData)
  const {
    filter = {},
    filterMulti = {},
    section = '',
    sectionTypes = {},
    sectionFilters = {},
    sectionEntries = {},
  } = nextData || {}
  const { key: valueKey, value: valueValue } = value || {}
  switch (action) {
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
      nextData.filterMulti[value.key].slice(
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
    case DATA_CONTEXT_ACTIONS.SECTION_SET_FILTERS:
      nextData.sectionLastId = value.value
      break
    case DATA_CONTEXT_ACTIONS.SECTION_SET_ENTRIES:
      nextData.sectionEntries = value.value
      break
    case DATA_CONTEXT_ACTIONS.SECTION_UPDATE_ENTRIES:
      nextData.sectionEntries = nextData.sectionEntries || {}
      nextData.sectionEntries[value.key] =
        nextData.sectionEntries[value.key] || []
      nextData.sectionEntries[value.key] = nextData.sectionEntries[
        value.key
      ].concat(value.value)
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
      getHmtData({
        filter: data.filter,
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
          window.alert('Application Loaded')
        })
        .catch((err) => {
          window.alert(`Something went wrong. ${err.message}`)
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
        <App />
      </DataContextValue.Provider>
    </DataContextAction.Provider>
  )
}

function App() {
  return (
    <Container>
      <Row>
        <Col>
          <HeaderComponent />
        </Col>
      </Row>
      <Row className='my-3'>
        <Col className='d-none d-md-block' md={3}>
          <AsideComponent />
        </Col>
        <Col sm={12} md={9}>
          <Row>
            <Col>
              <NavComponent />
            </Col>
          </Row>
          <Row>
            <Col>
              <MainComponent />
            </Col>
          </Row>
        </Col>
      </Row>
      <Row>
        <Col>
          <FooterComponent />
        </Col>
      </Row>
    </Container>
  )
}

function HeaderComponent() {
  return <header>HMT Watch</header>
}

function NavComponent() {
  const dataAction = useContext(DataContextAction)
  const dataValue = useContext(DataContextValue)
  const { filter = {}, sectionTypes = {} } = dataValue || {}
  return (
    <Nav
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
                {sectionType}
              </Nav.Link>
            </Nav.Item>
          )
        })}
    </Nav>
  )
}

function AsideComponent() {
  const dataValue = useContext(DataContextValue)
  const { sectionFilters = {} } = dataValue || {}
  return (
    <aside>
      <Form>
        <Accordion>
          {Object.entries(sectionFilters).map(
            ([sectionFilterKey, sectionFilterData = []]) => {
              return (
                <Accordion.Item
                  key={sectionFilterKey}
                  eventKey={sectionFilterKey}
                >
                  <Accordion.Header>{sectionFilterKey}</Accordion.Header>
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
    </aside>
  )
}

function MainComponent() {
  const dataValue = useContext(DataContextValue)
  const { filter = {}, sectionEntries = {} } = dataValue || {}
  const filterSectionEntries = sectionEntries[filter.section] || []
  return (
    <Row as='main' xs={1} sm={2} md={3} xxl={4} className='g-3'>
      {filterSectionEntries.map(
        ({
          id,
          prodId,
          product_title: title,
          product_Description: description,
          product_image: image,
          product_price: price,
          quantity,
          in_stock: inStock,
          discount,
        }) => {
          const isAvailable = ['1', 'yes'].includes(
            String(inStock).toLowerCase()
          )
          return (
            <Col
              key={id}
              as={isAvailable ? 'a' : 'div'}
              target={isAvailable ? '_blank' : false}
              href={
                isAvailable
                  ? `https://hmtwatches.in/product_details?id=${prodId}`
                  : false
              }
              className={
                isAvailable
                  ? 'text-decoration-none'
                  : 'text-decoration-line-through'
              }
            >
              <Card bg='white' text='dark' border='light' className='hover'>
                <Card.Img
                  variant='top'
                  loading='lazy'
                  src={image}
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
      {filterSectionEntries.length ? <button>Load More</button> : null}
    </Row>
  )
}

function FooterComponent() {
  return 'Footer'
}

// CSR
;(function csrInit() {
  const rootNode = document.getElementById('root')
  const root = ReactDOM.createRoot(rootNode)
  root.render(<Root />)
})()
