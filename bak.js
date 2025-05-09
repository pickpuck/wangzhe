$(".opt-contactus-010 .left .socialenter .relative_a").hover(function(){
    $(this).find(".contact_box").fadeIn();
  },function(){
    $(this).find(".contact_box").fadeOut();
  });
  
  
  function submitPopInquiryByParamMoret(){
    
    if(typeof(check_sort) == 'undefined'){
        check_sort = 0;
    }
  
    var senderphone = '';
    
      // 使用 document.getElementById 获取元素的值前，确保元素已经存在
      var nameElement = document.getElementById('inquiry_name');
      var lastnameElement = document.getElementById('inquiry_last_name');
      var businessElement = document.getElementById('inquiry_business');
      var telElement = document.getElementById('inquiry_tel');
      var titleElement = document.getElementById('inquiry_title');
      var companyElement = document.getElementById('inquiry_company');
      var countryElement = document.getElementById('inquiry_country');
      var countrytypeElement = document.getElementById('inquiry_country_type');
      var intpyetypeElement = document.getElementById('inquiry_inquiry_type');
      var mesgElement = document.getElementById('inquiry_message');
  
    
  
      if ( nameElement && lastnameElement && businessElement && telElement &&titleElement &&companyElement&&countryElement&&countrytypeElement&&intpyetypeElement && mesgElement ) {
        var name = nameElement.value;
        var lastname = lastnameElement.value;
        var business = businessElement.value;
        var country = countryElement.value;
        var countrytype = countrytypeElement.value;
        var inquirytype = intpyetypeElement.value;
  
        // 非必填
        var phone = telElement.value;
        var title = titleElement.value;
        var company = companyElement.value;
        var message = mesgElement.value;
    
      } else {
        console.log("Element not found");
        if (!nameElement) console.log("Email element not found");
        if (!lastnameElement) console.log("Subject element not found");
        if (!businessElement) console.log("Input1 element not found");
        if (!telElement) console.log("Input2 element not found");
        if (!titleElement) console.log("Message element not found");
        if (!companyElement) console.log("Phone element not found");
        if (!nameElement) console.log("Name element not found");
        if (!countryElement) console.log("Whatapp element not found");
        if (!inquirytype) console.log("Whatapp element not found");
      }
    var subject = defaulProductInfo.subject;
    var pid = defaulProductInfo.pid;
  // 必填
  if (check_sort === 0) {
    // 检查基本字段
    // name
    if (name === undefined || name.trim() === "") {
        showInquiryCreateDialog();
        document.getElementById('inquiry_name').style.border = "1px solid red";
        return false;
    } else {
        document.getElementById('inquiry_name').style.border = "";
    }
  // lastname
    if (lastname === undefined || lastname.trim() === "") {
        showInquiryCreateDialog();
        document.getElementById('inquiry_last_name').style.border = "1px solid red";
        return false;
    } else {
        document.getElementById('inquiry_last_name').style.border = "";
    }
    //business
    if (business === undefined || business.trim() === "") {
      showInquiryCreateDialog();
      document.getElementById('inquiry_business').style.border = "1px solid red";
      return false;
  } else {
      document.getElementById('inquiry_business').style.border = "";
  } 
  
    //business
    if (country === undefined || country.trim() === "") {
      showInquiryCreateDialog();
      document.getElementById('inquiry_country').style.border = "1px solid red";
      return false;
  } else {
      document.getElementById('inquiry_country').style.border = "";
  } 
  
    //countrytype
    if (countrytype === undefined || countrytype.trim() === "") {
      showInquiryCreateDialog();
      document.getElementById('inquiry_country_type').style.border = "1px solid red";
      return false;
  } else {
      document.getElementById('inquiry_country_type').style.border = "";
  } 
  // intpyetypeElement
  if (inquirytype === undefined || inquirytype.trim() === "") {
    showInquiryCreateDialog();
    document.getElementById('inquiry_inquiry_type').style.border = "1px solid red";
    return false;
  } else {
    document.getElementById('inquiry_inquiry_type').style.border = "";
  } 
  
  
  
    // 清除可能存在的错误边框
    document.getElementById('inquiry_name').style.border = "";
    document.getElementById('inquiry_last_name').style.border = "";
    document.getElementById('inquiry_business').style.border = "";
    document.getElementById('inquiry_country').style.border = "";
    document.getElementById('inquiry_country_type').style.border = "";
    document.getElementById('inquiry_inquiry_type').style.border = "";
  
  } else { // 如果 check_sort 不为 0 的情况
    // name
    if (name === undefined || name.trim() === "") {
      showInquiryCreateDialog();
      document.getElementById('inquiry_name').style.border = "1px solid red";
      return false;
  } else {
      document.getElementById('inquiry_name').style.border = "";
  }
  // lastname
  if (lastname === undefined || lastname.trim() === "") {
      showInquiryCreateDialog();
      document.getElementById('inquiry_last_name').style.border = "1px solid red";
      return false;
  } else {
      document.getElementById('inquiry_last_name').style.border = "";
  }
    //business
    if (business === undefined || business.trim() === "") {
      showInquiryCreateDialog();
      document.getElementById('inquiry_business').style.border = "1px solid red";
      return false;
  } else {
      document.getElementById('inquiry_business').style.border = "";
  } 
  
    //country
    if (country === undefined || country.trim() === "") {
      showInquiryCreateDialog();
      document.getElementById('inquiry_country').style.border = "1px solid red";
      return false;
  } else {
      document.getElementById('inquiry_country').style.border = "";
  } 
  
    //countrytype
    if (countrytype === undefined || countrytype.trim() === "") {
      showInquiryCreateDialog();
      document.getElementById('inquiry_country_type').style.border = "1px solid red";
      return false;
  } else {
      document.getElementById('inquiry_country_type').style.border = "";
  } 
  // intpyetypeElement
  if (inquirytype === undefined || inquirytype.trim() === "") {
    showInquiryCreateDialog();
    document.getElementById('inquiry_inquiry_type').style.border = "1px solid red";
    return false;
  } else {
    document.getElementById('inquiry_inquiry_type').style.border = "";
  } 
  
  // 清除可能存在的错误边框
  document.getElementById('inquiry_name').style.border = "";
  document.getElementById('inquiry_last_name').style.border = "";
  document.getElementById('inquiry_business').style.border = "";
  document.getElementById('inquiry_country').style.border = "";
  document.getElementById('inquiry_country_type').style.border = "";
  document.getElementById('inquiry_inquiry_type').style.border = "";
  }
  
    var productsku = "";
    if($("#product_sku").length > 0){
        productsku = $("#product_sku").html();
    }
  
    mytAjax.post(save_url,  "phone=" + phone + "&pid=" + pid + "&subject=" + subject  + "&message="+ message + "&messagesku=" + encodeURI(productsku) + "&custom_data[First Name]="+name +"&custom_data[Last Name]="+lastname +"&custom_data[Business Email Address]=" +business+ "&custom_data[country]="+country+"&custom_data[CompanyType]="+countrytype +"&custom_data[company]="+company+"&custom_data[inquirytype]=" + inquirytype + "&custom_data[title]=" + title +"&custom_data[message]=" + message,function(res){
        var mes = JSON.parse(res);
        if(mes.status == 200){
            var iid = mes.iid;
            document.getElementById("pop_iid").value = iid;
            document.getElementById("pop_uuid").value = mes.uuid;
            if(typeof gtag_report_conversion === "function"){
                gtag_report_conversion();//执行统计js代码
            }
            if(typeof fbq === "function"){
                fbq('track','Purchase');//执行统计js代码
            }
        }
    });
    initProduct(defaulProductInfo);
  
    if(name !== undefined && name != ""){
        _$$("#idnamepql")[0].value = name;
    }
  
    if(phone !== undefined && phone != ""){
        _$$("#idphonepql")[0].value = phone;
    }
  
    if(company !== undefined && company != ""){
        _$$("#idcompanypql")[0].value = company;
    }
  
    for (var index = 0; index < document.querySelectorAll(".dialog-content-pql").length; index++) {
        document.querySelectorAll(".dialog-content-pql")[index].style.display = "none";
  
    };
    document.getElementById("dialog-content-pql-id").style.display = "block";
  
  };