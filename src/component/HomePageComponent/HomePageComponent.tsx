import BootLoadingComponent from "./BootLoadingComponent";
import { Button, ButtonGroup, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Fab, TextField } from "@mui/material";
import { keyframes, stylesheet } from 'typestyle';
import { observer, useMobxState, useMount } from 'mobx-react-use-autorun';
import { useCpuUsage } from './js/useCpuUsage';
import { useReadyForApplication } from './js/useReadyForApplication';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { CSVLink } from "react-csv";
import SearchIcon from '@mui/icons-material/Search';
// import { JSDOM } from 'jsdom';

export default observer(() => {
  const state = useMobxState({
    headers: [
      { label: "数据项", key: "dataitem" },
      { label: "数据值", key: "data" },
      { label: "同比", key: "tongbi" }
    ],
    data: [
      { dataitem: "Ahmed", data: "Tomi", tongbi: "1111" },
      { dataitem: "Ahmed", data: "Tomi", tongbi: "1111" }
    ],
    gameDialog: {
      open: false,
    },
    dialogOpen: false,
    isShow: "none",
    txtData: '', // 存放统计页面上一级的html字符串
    txtData2: '', // 存放统计页面的html字符串
    staticText: '', // 存放统计数据页面的文本文字
    statisticsList: [{}],
    tableT: "",// 统计数据的标题
    tableD: "", // 统计数据的时间
    searchList: [{}],//用于搜索的list
    searchData: 0,
    css: stylesheet({
      container: {
        textAlign: "center"
      },
      header: {
        backgroundColor: "#282c34",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "calc(10px + 2vmin)",
        color: "white",
      },
      img: {
        height: "40vmin",
        pointerEvents: "none",
        animationName: keyframes({
          "from": {
            transform: "rotate(0deg)"
          },
          "to": {
            transform: "rotate(360deg)",
          }
        }),
        animationDuration: "20s",
        animationIterationCount: "infinite",
        animationTimingFunction: "linear",
      },
      batteryContainer: {
        color: "#61dafb",
        display: "flex",
        flexDirection: "column",
      }
    }),
  }, {
    cpuUsage: useCpuUsage(),
    ready: useReadyForApplication(),
  })

  useMount(() => {
    latestStatisticsData();
    // setInterval(() => {
    //   // 你自己的代码
    //   latestStatisticsData();
    //   parseStr("");
    // }, 3000);
  })

  function latestStatisticsData() {
    state.ready = false;
    axios({
      method: "get",
      url: "https://swt.nmg.gov.cn/zwgk/zcxxgk/fdzdgknr/spgs_15842/",
    }).then((res) => {
      // 请求该网页 获取该网页发布的文字
      // state.txtData = res.data;// 获取来的统计页面的html字符串数据
      let tempList = parseDataWithXPath(res.data, '/html/body/div[@class="table_box"]//table[@id="table1"]//tbody//tr//td[@class="mobile"]');
      let aHrefList = parseDataWithXPath(res.data, '/html/body/div[@class="table_box"]//table[@id="table1"]//tbody//tr//td[@class="mobile"]//a/@href');
      let tableT: any = parseDataWithXPath(res.data, '/html/body/div[@class="table_box"]//table[@id="table1"]//tbody//tr//td[@class="mobile"]//a/text()')[state.searchData];
      let tableD: any = parseDataWithXPath(res.data, '/html/body/div[@class="table_box"]//table[@id="table1"]//tbody//tr//td[@class="mobile"]//p[@class="clearfix"]/span/text()')[state.searchData];
      // 解析出统计里面最新一条的url 
      // let tempList = $x('/html/body/div//div[@id="01statistics"]//div//table[@id="table1"]/tbody/tr//td[@class="mobile"]');
      // let aHrefList = $x('/html/body/div//div[@id="01statistics"]//div//table[@id="table1"]/tbody/tr//td[@class="mobile"]//a/@href');
      // let tableT: any = $x('/html/body/div//div[@id="01statistics"]//div//table[@id="table1"]/tbody/tr//td[@class="mobile"]//a/text()')[state.searchData];
      // let tableD: any = $x('/html/body/div//div[@id="01statistics"]//div//table[@id="table1"]/tbody/tr//td[@class="mobile"]//p[@class="clearfix"]/span/text()')[state.searchData];
      state.tableT = tableT.data;
      state.tableD = tableD.data;
      let tempList2: { id: any; data: any; }[] = [];
      //生成用于搜索的list
      parseDataWithXPath(res.data, '/html/body/div[@class="table_box"]//table[@id="table1"]//tbody//tr//td[@class="mobile"]//a/text()').map((s: any, index1) => {
        if (index1 < 4) {
          let str: string = "";
          parseDataWithXPath(res.data, '/html/body/div[@class="table_box"]//table[@id="table1"]//tbody//tr//td[@class="mobile"]//p[@class="clearfix"]/span/text()').map((c: any, index2) => {
            if (index1 === index2) {
              let strTemp: string = c.data;
              str = strTemp.split("：")[1].slice(0, 10);
            }
          })
          tempList2.push({ id: str, data: s.data + ";时间:" + str });
        }
      })
      state.searchList = tempList2;
      let aHref: any = aHrefList[state.searchData];
      if (aHref.value) {
        axios({
          method: "get",
          url: aHref.value
        }).then((res) => {
          // state.txtData = '';
          state.txtData2 = res.data;
          getStatisticsText(res.data);
          // 使用xpath解析出网页中的文字
          // state.ready = true;
          parseStr("");
        }).catch((e) => {
          console.error(e);
        })
      }
    }).catch((e) => {
      console.error(e);
    });
  }

  /**
   *  封装xpath
   */
  function getElementByXpath(xpath: string) {
    var element = document.evaluate(xpath, document).iterateNext();
    return element;
  }

  /**
   * 获取统计数据网页的文字
   */
  function getStatisticsText(str_: string) {
    let dataStr = ''; // 用来接收解析出来的字符串
    // let textList = $x('/html/body/div//div[@id="statistics"]//div[@id="pare"]//div[@class="view TRS_UEDITOR trs_paper_default trs_word"]//p/text()');
    let textList = parseDataWithXPath(str_, '/html/body/div[@id="pc_version"]/div[@class="Tongyxl w1180 clearfix"]/div[@id="bd"]/div[@id="pare"]//div[@class="view TRS_UEDITOR trs_paper_default trs_word"]//p/text()');
    if (textList.length === 0) {
      textList = parseDataWithXPath(str_, '/html/body/div[@id="pc_version"]/div[@class="Tongyxl w1180 clearfix"]/div[@id="bd"]/div[@id="pare"]//div[@class="view TRS_UEDITOR trs_paper_default trs_word"]//p//span/text()');
    }
    textList.map((text: any) => {
      dataStr += text.data;
    })
    state.staticText = dataStr;
  }

  function $x(STR_XPATH: string) {
    var xresult = document.evaluate(STR_XPATH, document, null, XPathResult.ANY_TYPE, null);
    var xnodes = [];
    var xres;
    while (xres = xresult.iterateNext()) {
      xnodes.push(xres);
    }
    return xnodes;
  }

  /**
   * 用来页面表格数据渲染
   * @param name 
   * @param calories 
   * @returns 
   */
  function createData(name: string, calories: any) {
    return { name, calories };
  }

  /**
   * 正则匹配相关数据并格式化返回数据
   * @param rowName 
   * @param reg 
   * @param index 
   * @returns 
   */
  function formatData(rowName: string, reg: RegExp, index: number, subStr: string) {
    const regMatch = reg.exec(state.staticText);
    let str = "";
    if (regMatch && regMatch[index]) {
      str = regMatch[index];
    }
    str = str + subStr;
    const id = uuidv4();
    return { id, rowName, str }
  }

  /**
   * 解析html字符串中内容
   * @param sStr html字符串
   * @param xpath_1 xpath
   * @returns 
   */
  function parseDataWithXPath(sStr: string, xpath_1: string) {
    let parser = new DOMParser();
    const doc = parser.parseFromString(sStr, 'text/html');
    // 使用 XPath 解析
    const result = document.evaluate(
      xpath_1,
      doc,
      null,
      XPathResult.ANY_TYPE,
      null
    );
    const nodes = [];
    let node = result.iterateNext();

    while (node) {
      nodes.push(node);
      node = result.iterateNext();
    }
    return nodes;
  }

  /**
 * 正则匹配相关数据并格式化返回数据
 * @param rowName 
 * @param reg 
 * @param index 
 * @returns 
 */
  function getMatch(reg: RegExp, index: number) {
    const regMatch = reg.exec(state.staticText);
    if (regMatch && regMatch[index]) {
      return regMatch[index];
    }
    return "";
  }

  /**
   * 解析字符串
   * @param str 被解析的字符串
   */
  function parseStr(str: string) {
    // 用来接收解析后的数据
    let tempArray = [];

    // 全区社会消费品零售总额
    const retailTotalRegex = /全区社会消费品零售总额([\d.]+)亿元.*?(下降|增长)([\d.]+)(%|％)/;
    console.log(getMatch(retailTotalRegex, 3));
    tempArray.push(formatData("全区社会消费品零售总额", retailTotalRegex, 1, "亿元"));
    tempArray.push(formatData("同比", retailTotalRegex, 2, getMatch(retailTotalRegex, 3) + "%"));

    // 全区外贸进出口
    const importExportRegex = /进出口.*?([\d.]+)亿元..*?(下降|增长)([\d.]+)(%|％)/;
    tempArray.push(formatData("全区外贸进出口额", importExportRegex, 1, "亿元"));
    tempArray.push(formatData("同比", importExportRegex, 2, getMatch(importExportRegex, 3) + "%"));
    console.log(importExportRegex.exec(state.staticText));

    // 匹配全区实际使用外资
    const re1 = /全区实际使用外资([\d.]+)亿元.*?(增长|降低)([\d.]+)%（折合([\d.]+)(亿|万|千)美元，.*?(增长|降低)([\d.]+)(%|％)）/;
    console.log(re1.exec(state.staticText));
    tempArray.push(formatData("全区实际使用外资", re1, 1, "亿元"));
    tempArray.push(formatData("同比", re1, 2, getMatch(re1, 3) + "%"));
    tempArray.push(formatData("全区实际使用外资折合美元", re1, 4, getMatch(re1, 5) + "美元"));
    tempArray.push(formatData("同比", re1, 6, getMatch(re1, 7) + "%"));

    //全区口岸进出境货运量
    const quanqujinchujingRegex = /全区口岸进出境货运量.*?([\d.]+)万吨，.*?(增长|下降)([\d.]+)?(%|％)/;
    tempArray.push(formatData("全区口岸进出境货运量", quanqujinchujingRegex, 1, "万吨"));
    tempArray.push(formatData("同比", quanqujinchujingRegex, 2, getMatch(quanqujinchujingRegex, 3) + "%"));

    const jinjinghuoyunRegex = /进境.*?([\d.]+)万吨，.*?(增长|下降)([\d.]+)?(%|％)/;
    tempArray.push(formatData("进境货运量", jinjinghuoyunRegex, 1, "万吨"));
    tempArray.push(formatData("同比", jinjinghuoyunRegex, 2, getMatch(jinjinghuoyunRegex, 3) + "%"));

    const chujinghuoyunRegex = /出境.*?([\d.]+)万吨，.*?(增长|下降)([\d.]+)(%|％)/;
    tempArray.push(formatData("出境货运量", chujinghuoyunRegex, 1, "万吨"));
    tempArray.push(formatData("同比", chujinghuoyunRegex, 2, getMatch(chujinghuoyunRegex, 3) + "%"));

    // 中欧班列
    const jinchujingzhongoubanlieRegex = /全区进出境中欧班列(\d+)列，.*?(增长|下降)([\d.]+)?(%|％)/;
    console.log(jinchujingzhongoubanlieRegex.exec(state.staticText));
    tempArray.push(formatData("全区进出境中欧班列", jinchujingzhongoubanlieRegex, 1, "列"));
    tempArray.push(formatData("同比", jinchujingzhongoubanlieRegex, 2, getMatch(jinchujingzhongoubanlieRegex, 3) + "%"));

    const manzhoulijinchujingRegex = /满洲里口岸进出境中欧班列(\d+)列，.*?(增长|下降)([\d.]+)?(%|％)/;
    console.log(manzhoulijinchujingRegex.exec(state.staticText));
    tempArray.push(formatData("满洲里口岸进出境中欧班列", manzhoulijinchujingRegex, 1, "列"));
    tempArray.push(formatData("同比", manzhoulijinchujingRegex, 2, getMatch(manzhoulijinchujingRegex, 3) + "%"));

    const erlianjinchujingRegex = /二连浩特口岸进出境中欧班列(\d+)列，.*?(增长|下降)([\d.]+)?(%|％)/;
    console.log(erlianjinchujingRegex.exec(state.staticText));
    tempArray.push(formatData("二连浩特口岸进出境中欧班列", erlianjinchujingRegex, 1, "列"));
    tempArray.push(formatData("同比", erlianjinchujingRegex, 2, getMatch(erlianjinchujingRegex, 3) + "%"));

    state.statisticsList = tempArray;

    // 同比和相应的数据项合并成一个list  [{ dataitem: "Ahmed", data: "Tomi",tongbi:"1111" },{ dataitem: "Ahmed", data: "Tomi",tongbi:"1111" }]
    let dataList1 = tempArray.filter((s, index) => {
      return index % 2 === 0;
    })
    let dataList2 = tempArray.filter((s, index) => {
      return index % 2 !== 0;
    })

    let exportData = new Array();
    dataList1.map((s: any, index1) => {
      let temp = "";
      dataList2.map((j: any, index2) => {
        if (index1 === index2) {
          temp = j.str;
        }
      })
      let obj = { dataitem: s.rowName, data: s.str, tongbi: temp };
      exportData.push(obj);
    })
    state.data = exportData;
  }


  return (<>
    {/* {!state.ready && BootLoadingComponent} */}
    {!state.ready && BootLoadingComponent}
    {state.ready && <><div className={state.css.container} style={{ marginTop: "1em", display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "space-around" }}>
      <ButtonGroup variant="contained" aria-label="outlined primary button group">
        <Button variant="contained"
          onClick={() => {
            state.searchData = 0;
            latestStatisticsData();
          }}>
          最新统计信息
        </Button>
        <Button variant="contained">
          <a style={{ textDecoration: "none", outline: "none", color: "#ffffff" }} href="https://swt.nmg.gov.cn/zwgk/zcxxgk/fdzdgknr/?gk=3" target="_blank">网站预览</a>
        </Button>
        <Button variant="contained" onClick={() => {
          state.dialogOpen = true;
        }}>
          {/* <a style={{ textDecoration: "none", outline: "none", color: "#ffffff" }} href="/statisticsPage"  >解析</a> */}
          查看统计页面数据
        </Button>
        <Button variant="contained">
          <CSVLink style={{ color: "white", textDecoration: "none", outline: "none" }} data={state.data} headers={state.headers} filename={new Date().toLocaleString(undefined, {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
          }) + "统计数据"}>
            导出
          </CSVLink>
        </Button>
      </ButtonGroup>
      <div className="form-group flex flex-row items-center" style={{ width: "30%" }}>
        <select className="form-control" id="exampleFormControlSelect1" onChange={(t) => {
          state.searchData = parseInt(t.target.value);
        }}>
          {state.searchList.map((s: any, index) => <option value={index} id={s.id} selected={state.searchData === index}>{s.data}</option>
          )}
        </select>
        <Fab color="primary" size={"small"} aria-label="add" style={{ marginLeft: "1em" }} onClick={() => {
          latestStatisticsData();
          parseStr("");
        }}>
          <SearchIcon />
        </Fab>
      </div>
      <div id='01statistics' dangerouslySetInnerHTML={{ __html: state.txtData }} style={{ display: "none" }}></div>
      <div id='statistics' dangerouslySetInnerHTML={{ __html: state.txtData2 }} style={{ display: state.isShow }}></div>
    </div><div style={{ marginTop: "2em" }}>
        <div className='flex flex-row items-center justify-content-around' style={{ height: "4em", borderRadius: "5px", backgroundColor: "#007bff", color: "white" }}>
          <div>标题:<span>{state.tableT}</span></div>
          <div>{state.tableD}</div>
        </div>
        <div style={{ width: "100%", height: "100%" }} className="flex flex-row items-center justify-content-around">
          <div style={{ width: "45%" }}>
            <table className="table table-hover">
              <thead>
                <tr>
                  <th scope="col">KEYWORDS</th>
                  <th scope="col">DATA</th>
                </tr>
              </thead>
              <tbody>
                {state.statisticsList.filter((a, index) => { return index % 2 === 0; }).map((s: any) => <tr key={s.id}>
                  <th scope="row">{s.rowName}</th>
                  <td>{s.str}</td>
                </tr>
                )}
              </tbody>
            </table>
          </div>
          <div style={{ width: "45%" }}>
            <table className="table table-hover">
              <thead>
                <tr>
                  <th scope="col">KEYWORDS</th>
                  <th scope="col">DATA</th>
                </tr>
              </thead>
              <tbody>
                {state.statisticsList.filter((a, index) => { return index % 2 !== 0; }).map((s: any) => <tr key={s.id}>
                  <th scope="row">{s.rowName}</th>
                  <td>{s.str}</td>
                </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        <div>
        </div>
      </div><Dialog open={state.dialogOpen} fullWidth={true} maxWidth={'md'}
        onClose={() => { state.dialogOpen = false; }} aria-labelledby="form-dialog-title">
        <DialogTitle id="form-dialog-title">统计页面数据</DialogTitle>
        <DialogContent>
          <DialogContentText>
          </DialogContentText>
          <TextField
            rows={10}
            multiline
            margin="dense"
            id="name"
            label="文本"
            type="text"
            fullWidth
            value={state.staticText}
            defaultValue={state.staticText}
            onChange={(e) => {
              state.staticText = e.target.value;
            }} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { state.dialogOpen = false; }} color="primary">
            关闭
          </Button>
          <Button onClick={() => { }} color="primary">
            确定
          </Button>
        </DialogActions>
      </Dialog></>
    }

  </>);
})