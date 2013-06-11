select * from web_optin_type where maritz_code like '5C%' order by date_created;
select * from web_mobile_handraiser_optin  where optin_type_id=37 order by date_created;

select * from web_dealer_lead_queue order by dealer_lead_queue_id desc;
select * from web_lead order by lead_entry_date desc;

-- LEGACY
select * from lead where email_address_tx='testDK@test.com' order by lead_entry_date desc;
select * from lead_maritz_question where lead_id=7118408;
select * from lead where email_address_tx='testJX@test.com' order by lead_entry_date desc;
select * from lead_source_web_site where lead_source_web_site_id=10178;


select * from LEAD_PROCESSING_CNTRL_MARITZ where lead_id=7415101;
select * from LEAD_PROCESSING_CNTRL_US where le=7415101;

select * from LEAD_PROCESSING_CNTRL_MARITZ where lead_id=7118308;
select * from LEAD_PROCESSING_CNTRL_US where lead_id=7118308;
update LEAD_PROCESSING_CNTRL_US set lead_data_format_cd='IRFUS' where lead_id=7118308 ;
update LEAD_PROCESSING_CNTRL_US set status_cd_nb=0 where lead_id=7118308 ;
update LEAD_PROCESSING_CNTRL_US set attempt_nb=0 where lead_id=7118308 ;

select * from LEAD_PROCESSING_CNTRL_MARITZ order by 1 desc;
select * from LEAD_PROCESSING_CNTRL_US order by 1 desc;

select * from LEAD_PROCESSING_CNTRL_MARITZ where lead_id=7118408;
select * from LEAD_PROCESSING_CNTRL_US where lead_id=7118408;
update LEAD_PROCESSING_CNTRL_US set lead_data_format_cd='IRFUS' where lead_id=7118308 ;
-- IRFUS
select distinct lead_data_format_cd from LEAD_PROCESSING_CNTRL_US;

select * from lead where email_address_tx='test50@test.com' order by lead_entry_date desc;
select * from LEAD_PROCESSING_CNTRL_MARITZ where lead_id=7120116;
select * from LEAD_PROCESSING_CNTRL_US where lead_id=7120116;

select * from lead where lead_source_web_site_id in (10178, 10179) order by lead_entry_date desc;
select count(*) from lead where lead_source_web_site_id in (10178, 10179) order by lead_entry_date desc;
select * from LEAD_PROCESSING_CNTRL_MARITZ where lead_id=10183644;
select * from LEAD_PROCESSING_CNTRL_US where lead_id=10183644;

select count(*) from lead where lead_source_web_site_id in (10178, 10179) order by lead_entry_date desc;
select count(*) from lead where lead_source_web_site_id in (10178) order by lead_entry_date desc;
select count(*) from lead where lead_source_web_site_id in (10179) order by lead_entry_date desc;


select * from lead where lead_source_web_site_id in (10178) order by lead_entry_date desc;
select * from lead where lead_source_web_site_id in (10179) order by lead_entry_date desc;

