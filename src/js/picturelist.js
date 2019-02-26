var myModel = {courseList:[]};
var sem = {semList:[]};
var id='';
studentid=sessionStorage.getItem('id');
function getData(){
    $.ajax({
        url: "/course/student/"+studentid,                //后端的API地址
        type: 'GET',                                //http:POST/GET
        async:false,
        dataType: 'json',                            //服务端返回类型text，JSON
        timeout: 3000,
        success: function(res){
            myModel.courseList=res;
            var htmlNav='';
            $("#myView").empty();
            if( myModel.courseList.length>0)
            {
                htmlNav+='<ul class="yiji">';
                for(var i=0;i< myModel.courseList.length;i++)
                {
                    htmlNav+='<li>' +'<a href="#" class="inactive">'+myModel.courseList[i].courseName+'</a>';
                    htmlNav+='<ul style="display: none">';
                    htmlNav+='<li><a href="s_CouInf.html?courseid='+myModel.courseList[i].id+'" class="inactive active">课程信息</a>'+'</li>';
                    htmlNav+='<li><a href="s_Gra.html?courseid='+myModel.courseList[i].id+'&studentid='+studentid+'" class="inactive active">我的成绩</a>'+'</li>';
                    htmlNav+='<li><a href="s_TeaMemNotStop.html?courseid='+myModel.courseList[i].id+'&studentid='+studentid+'" class="inactive active">我的组队</a>'+'</li>';
                    htmlNav+='</ul>';
                    htmlNav+='</li>';
                }
                htmlNav+='</ul>';
                $("#myView").html(htmlNav);
            }
        },
        error: function(){
            alert('服务器忙，请稍候');
        }
    });
}