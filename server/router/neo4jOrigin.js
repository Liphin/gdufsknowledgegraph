/**
 * Created by Administrator on 2018/12/30.
 */
const data = require('../data');
const express = require('express');
const uuidv1 = require('uuid/v1');
const request = require('request');
const router = express.Router();

//节点句柄
const gdufsTeacher = require('../neo4j/node/gdufs_teacher');
const visitorDept = require('../neo4j/node/visitor_dept');
const gdufsDept = require('../neo4j/node/gdufs_dept');
const visitEvent = require('../neo4j/node/visit_event');
const visitor = require('../neo4j/node/visitor');

//关系句柄
const gdufsTeacherVisitEvent = require('../neo4j/relation/gdufs_teacher_visit_event');
const visitorVisitDept = require('../neo4j/relation/visitor_visitor_dept');
const visitorVisitEvent = require('../neo4j/relation/visitor_visit_event');

//其他加载及解析
const newsParse = require('../service/newsParse');
const utilTool = require('../service/utilTool');


/**
 * 添加广外外事新的关系节点和数据存储
 */
router.post('/addVisitNewsData', (req, res, next) => {
    //从前台获取创建的请求数据
    let bodyData = req.body;
    bodyData['unique_id'] = uuidv1();

    //获取初始化neo图数据库句柄
    let driver = data.dbPool['neo4j'];

    //所有节点创建完成
    Promise.all([
        gdufsTeacher.gdufsTeachInitCheck(bodyData, driver), //广外接待领导和教师节点
        visitorDept.deptInitCheck(bodyData, driver), //来访单位节点
        visitEvent.visitEventInitCheck(bodyData, driver), //来访事件节点
        visitor.visitorInitCheck(bodyData, driver)] //来访者节点
    ).then(([result1, result2, result3, result4]) => {

        //若创建过程出错则立即返回，不再继续进行
        if (result1 == 200 && result2 == 200 && result3 == 200 && result4 == 200) {
            //各节点间关系的创建
            Promise.all([
                gdufsTeacherVisitEvent.gdufsTeacherVisitEventInit(bodyData, driver), //广外接待领导教师——来访事件关系
                visitorVisitDept.visitorVisitDeptInit(bodyData, driver), //来访嘉宾——所在单位关系
                visitorVisitEvent.visitorVisitEventInit(bodyData, driver)] //来访嘉宾——来访事件关系

            ).then(([result5, result6, result7]) => {

                if (result5 == 200 && result6 == 200 && result7 == 200) {
                    //1、把HTML文件存储到OSS中，异步操作，用于查看原文时使用
                    newsParse.newsHttpRequestAndParse(bodyData);

                    //2、简单返回正确代码到前端即可
                    //console.log('end', utilTool.getCurrentDataTime());
                    res.send({status: 200});
                }
                else {
                    //console.log('print 2');
                    res.send({
                        status: 408,
                        result: [result5, result6, result7]
                    });
                }
            });
        }
        else {
            //console.log('print 3');
            res.send({
                status: 407,
                result: [result1, result2, result3, result4]
            });
        }
    });
});


// let bodyData = {
//     visitData: '的广军'
// };
// let driver = data.dbPool['neo4j'];
// const session = driver.session();
// let visitEvents = [];
// session.run('match (vd:Visitor_Dept)<-[:Visitor_Visitor_Dept]-(:Visitor)-[:Visitor_Visit_Event]->(n:Visit_Event) where vd.unique_id=$unique_id return distinct properties(n) as result',
//     {unique_id: '0114bb90-3335-11e9-b570-4b19d3f9054f'})
//     .subscribe({
//         onNext: record => {
//             visitEvents.push(record.get('result'));
//         },
//         onCompleted: () => {
//             console.log(visitEvents)
//         },
//         onError: error => {
//             console.log(error)
//         }
//     });

// let driver = data.dbPool['neo4j'];
// let visitData = '波兰共和国驻华大使馆'
// Promise.all([
//     visitorDept.searchVisitDeptNode(visitData, driver)
// ]).then(([result1]) => {
//     console.log(result1)
// });


/**
 * 搜索相应的来访数据
 */
router.post('/searchVisitData', (req, res, next) => {
    //获取初始化neo图数据库句柄
    let driver = data.dbPool['neo4j'];

    //从前台获取创建的请求数据
    let bodyData = req['body']; //searchTypeValue、visitData
    let visitData = bodyData['visitData'];
    console.log('searchVisitData bodyData', bodyData);
    switch (bodyData['searchTypeValue']) {
        //人物搜索
        case '1': {
            Promise.all([
                gdufsTeacher.searchTeacherVisitNode(visitData, driver),
                visitor.searchVisitorNode(visitData, driver)
            ]).then(([result1, result2]) => {
                //直接返回结果到前端，若无数据或则结果状态为400，前端进行渲染解析
                res.send([result1, result2]);
            });
            break;
        }
        //事件搜索
        case '2': {
            Promise.all([
                visitEvent.searchVisitEventNode(visitData, driver)
            ]).then(([result1]) => {
                //事件搜索直接返回事件数组
                res.send(result1);
            });
            break;
        }
        //单位搜索
        case '3': {
            Promise.all([
                visitorDept.searchVisitDeptNode(visitData, driver)
            ]).then(([result1]) => {
                res.send([result1]);
            });
            break;
        }
        //其他情况直接返回
        default: {
            res.send(400);
            break;
        }
    }
});


/**
 * 获取搜索出来的详情数据
 */
router.post('/getDetailInfo', (req, res, next) => {
    //获取初始化neo图数据库句柄
    let driver = data.dbPool['neo4j'];

    //从前台获取创建的请求数据
    let bodyData = req['body']; //unique_id、type
    console.log('getDetailInfo bodyData', bodyData);
    let uniqueId = bodyData['unique_id'];
    switch (bodyData['type']) {
        //人物搜索
        case 'gdufs_teacher': {
            Promise.all([
                gdufsTeacher.getGdufsTeacherEvent(uniqueId, driver)
            ]).then(([result1]) => {
                //直接返回结果到前端，若无数据或则结果状态为400，前端进行渲染解析
                res.send(result1);
            });
            break;
        }
        //事件搜索
        case 'visitor': {
            Promise.all([
                visitor.getVisitorEvent(uniqueId, driver)
            ]).then(([result1]) => {
                res.send(result1);
            });
            break;
        }
        //单位搜索
        case 'visitor_dept': {
            Promise.all([
                visitorDept.getVisitorDeptEvent(uniqueId, driver)
            ]).then(([result1]) => {
                res.send(result1);
            });
            break;
        }
        //其他情况直接返回
        default: {
            console.log('unknown body type', bodyData['type'])
            res.sendStatus(400);
            break;
        }
    }
});


/**
 * 获取所有Gdufs_Teacher, Visitor, Visitor_Dept节点的数据
 */
router.post('/getAllFillData', (req, res, next) => {

    //获取初始化neo图数据库句柄
    let driver = data.dbPool['neo4j'];

    Promise.all([
        gdufsTeacher.getAllGdufsTeacherNode(driver), //广外接待领导和教师节点
        visitor.getAllVisitorNode(driver),//来访者节点
        visitorDept.getAllVisitDeptNode(driver)] //来访单位节点
    ).then(([result1, result2, result3]) => {
        res.send({
            'gdufs_teacher': result1,
            'visitor': result2,
            'visitor_dept': result3
        })
    });
});


/**
 * 更新节点信息数据
 */
router.post('/updateNodeInfo', (req, res, next) => {

    let driver = data.dbPool['neo4j'];
    let session = driver.session();
    let bodyData = req['body'];
    let cqlStr = '';

    //Visitor节点
    if (bodyData['type'] == 'visitor') {
        cqlStr = 'match (n:Visitor) where n.unique_id=$unique_id set n.profile=$profile, n.en_name=$en_name, n.cn_name=$cn_name, n.title=$title';
    }
    //Visitor_Dept节点
    else if (bodyData['type'] == 'visitor_dept') {
        cqlStr = 'match (n:Visitor_Dept) where n.unique_id=$unique_id set n.introduction=$introduction, n.nation=$nation, n.en_name=$en_name, n.cn_name=$cn_name';
    }
    console.log('data', bodyData['value']);
    //执行cql语句进行数据更新操作
    session.run(cqlStr, bodyData['value'])
        .subscribe({
            onCompleted: () => {
                res.sendStatus(200);
            },
            onError: error => {
                console.log('error', error);
                res.sendStatus(400);
            }
        });
});


/**
 * 获取所有节点和连接关系数据
 */
router.post('/getAllNodeAndLinksData', (req, res, next) => {
    let driver = data.dbPool['neo4j'];

    Promise.all([
        gdufsTeacher.getAllGdufsTeacherNode(driver), //广外接待领导和教师节点
        visitor.getAllVisitorNode(driver),//来访者节点
        visitorDept.getAllVisitDeptNode(driver), //来访单位节点
        visitEvent.getAllVisitEventNode(driver), //来访单位节点
        gdufsTeacherVisitEvent.getAllGdufsTeacherVisitEventLink(driver), //广外教师——来访事件连接
        visitorVisitEvent.getAllVisitorVisitEventLink(driver),//来访嘉宾——来访事件连接
        visitorVisitDept.getAllVisitorVisitorDeptLink(driver)]//来访嘉宾——来访嘉宾部门连接
    ).then(([result1, result2, result3, result4, result5, result6, result7]) => {
        let nodes = result1.concat(result2).concat(result3).concat(result4);
        let links = result5.concat(result6).concat(result7);
        res.send({
            'nodes': nodes,
            'links': links
        });
    });
});


router.post('/searchTargetNodeLinks', (req, res, next) =>{

});



module.exports = router;










