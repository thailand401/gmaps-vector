"""
PHP unserialize — parse PHP serialized strings into Python objects.
Usage:
    python php_unserialize.py 'a:2:{s:3:"foo";i:1;s:3:"bar";b:1;}'
    or import and call php_unserialize(data)
"""

import sys
import json


def php_unserialize(data: str):
    """Deserialize a PHP serialized string into a Python object."""
    data = data.strip()
    obj, pos = _parse(data, 0)
    return obj


# ── Internal parser ──────────────────────────────────────────────────────────

def _parse(s: str, pos: int):
    if pos >= len(s):
        raise ValueError(f"Unexpected end of data at position {pos}")

    token = s[pos]

    if token == 'N':                        # null  →  N;
        return None, pos + 2               # skip 'N' and ';'

    if token == 'b':                        # bool  →  b:0; or b:1;
        val = s[pos + 2] == '1'
        return val, pos + 4

    if token == 'i':                        # int   →  i:123;
        end = s.index(';', pos)
        return int(s[pos + 2:end]), end + 1

    if token == 'd':                        # float →  d:1.5;
        end = s.index(';', pos)
        return float(s[pos + 2:end]), end + 1

    if token == 's':                        # string → s:3:"foo";
        colon = s.index(':', pos + 2)
        length = int(s[pos + 2:colon])
        # skip colon and opening quote
        start = colon + 2
        value = s[start:start + length]
        return value, start + length + 2    # skip closing '";'

    if token == 'a':                        # array  → a:2:{...}
        colon = s.index(':', pos + 2)
        count = int(s[pos + 2:colon])
        pos = colon + 2                     # skip past '{'
        result = {}
        for _ in range(count):
            key, pos = _parse(s, pos)
            val, pos = _parse(s, pos)
            result[key] = val
        return result, pos + 1             # skip '}'

    if token == 'O':                        # object → O:9:"ClassName":2:{...}
        # class name length
        colon1 = s.index(':', pos + 2)
        cls_len = int(s[pos + 2:colon1])
        cls_start = colon1 + 2
        class_name = s[cls_start:cls_start + cls_len]
        # property count
        colon2 = s.index(':', cls_start + cls_len + 2)
        prop_count = int(s[cls_start + cls_len + 2:colon2])
        pos = colon2 + 2                   # skip past '{'
        props = {}
        for _ in range(prop_count):
            key, pos = _parse(s, pos)
            val, pos = _parse(s, pos)
            props[key] = val
        result = {"__class__": class_name, **props}
        return result, pos + 1            # skip '}'

    if token == 'C':                        # custom serialized → C:classname:len:{data}
        colon1 = s.index(':', pos + 2)
        cls_len = int(s[pos + 2:colon1])
        cls_start = colon1 + 2
        class_name = s[cls_start:cls_start + cls_len]
        colon2 = s.index(':', cls_start + cls_len + 1)
        data_len = int(s[cls_start + cls_len + 1:colon2])
        data_start = colon2 + 2
        raw = s[data_start:data_start + data_len]
        result = {"__class__": class_name, "__data__": raw}
        return result, data_start + data_len + 1

    raise ValueError(f"Unknown type token '{token}' at position {pos}")


# ── Serializer ───────────────────────────────────────────────────────────────

def php_serialize(obj) -> str:
    """Serialize a Python object back into a PHP serialized string."""
    if obj is None:
        return 'N;'
    if isinstance(obj, bool):
        return f'b:{1 if obj else 0};'
    if isinstance(obj, int):
        return f'i:{obj};'
    if isinstance(obj, float):
        return f'd:{obj};'
    if isinstance(obj, str):
        return f's:{len(obj.encode("utf-8"))}:"{obj}";'
    if isinstance(obj, (list, tuple)):
        parts = ''.join(php_serialize(i) + php_serialize(v) for i, v in enumerate(obj))
        return f'a:{len(obj)}:{{{parts}}}'
    if isinstance(obj, dict):
        # Object with __class__ key → O type
        if '__class__' in obj:
            class_name = obj['__class__']
            props = {k: v for k, v in obj.items() if k != '__class__'}
            parts = ''.join(php_serialize(k) + php_serialize(v) for k, v in props.items())
            return f'O:{len(class_name)}:"{class_name}":{len(props)}:{{{parts}}}'
        parts = ''.join(php_serialize(k) + php_serialize(v) for k, v in obj.items())
        return f'a:{len(obj)}:{{{parts}}}'
    raise TypeError(f"Cannot serialize type: {type(obj)}")


# ── Input string ─────────────────────────────────────────────────────────────

PHP_STRING = 'a:4:{s:5:"_core";a:1:{s:19:"default_config_hash";s:43:"R4IF-ClDHXxblLcG0L7MgsLvfBIMAvi_skumNFQwkDc";}s:6:"module";a:276:{s:7:"address";i:0;s:13:"admin_toolbar";i:0;s:19:"admin_toolbar_tools";i:0;s:23:"advanced_text_formatter";i:0;s:10:"autologout";i:0;s:3:"ban";i:0;s:8:"big_pipe";i:0;s:5:"blazy";i:0;s:5:"block";i:0;s:13:"block_content";i:0;s:11:"block_field";i:0;s:17:"bootstrap_library";i:0;s:10:"breakpoint";i:0;s:13:"campaign_erun";i:0;s:16:"campaign_lead_ad";i:0;s:22:"campaign_sportify_2021";i:0;s:7:"captcha";i:0;s:9:"ckeditor5";i:0;s:17:"classy_paragraphs";i:0;s:8:"colorbox";i:0;s:7:"comment";i:0;s:6:"config";i:0;s:13:"config_filter";i:0;s:13:"config_ignore";i:0;s:12:"config_pages";i:0;s:12:"config_split";i:0;s:13:"config_update";i:0;s:7:"contact";i:0;s:7:"context";i:0;s:18:"context_breadcrumb";i:0;s:10:"context_ui";i:0;s:10:"contextual";i:0;s:12:"core_context";i:0;s:4:"crop";i:0;s:17:"csv_serialization";i:0;s:6:"ctools";i:0;s:12:"ctools_block";i:0;s:9:"datalayer";i:0;s:8:"datetime";i:0;s:10:"dropzonejs";i:0;s:20:"dropzonejs_eb_widget";i:0;s:15:"dsu_c_accordion";i:0;s:26:"dsu_c_background_component";i:0;s:18:"dsu_c_contentcycle";i:0;s:17:"dsu_c_entitycycle";i:0;s:22:"dsu_c_extend_component";i:0;s:19:"dsu_c_externalvideo";i:0;s:13:"dsu_c_gallery";i:0;s:11:"dsu_c_image";i:0;s:29:"dsu_c_link_document_container";i:0;s:21:"dsu_c_product_extends";i:0;s:18:"dsu_c_sharebuttons";i:0;s:19:"dsu_c_sideimagetext";i:0;s:12:"dsu_c_slider";i:0;s:10:"dsu_c_text";i:0;s:15:"dsu_c_text_card";i:0;s:14:"dsu_c_text_dyk";i:0;s:10:"dsu_c_view";i:0;s:8:"dsu_core";i:0;s:19:"dsu_ratings_reviews";i:0;s:6:"editor";i:0;s:5:"embed";i:0;s:7:"encrypt";i:0;s:14:"entity_browser";i:0;s:22:"entity_class_formatter";i:0;s:12:"entity_clone";i:0;s:12:"entity_embed";i:0;s:26:"entity_reference_revisions";i:0;s:17:"external_hreflang";i:0;s:12:"externalauth";i:0;s:6:"facets";i:0;s:8:"features";i:0;s:11:"features_ui";i:0;s:5:"field";i:0;s:11:"field_group";i:0;s:11:"field_timer";i:0;s:8:"field_ui";i:0;s:4:"file";i:0;s:12:"file_browser";i:0;s:28:"file_upload_secure_validator";i:0;s:6:"filter";i:0;s:8:"fivestar";i:0;s:4:"flag";i:0;s:11:"focal_point";i:0;s:11:"geolocation";i:0;s:5:"gigya";i:0;s:10:"gigya_raas";i:0;s:19:"gigya_user_deletion";i:0;s:16:"google_analytics";i:0;s:15:"google_optimize";i:0;s:18:"google_optimize_js";i:0;s:10:"google_tag";i:0;s:8:"honeypot";i:0;s:5:"image";i:0;s:17:"image_widget_crop";i:0;s:18:"inline_entity_form";i:0;s:9:"jquery_ui";i:0;s:22:"jquery_ui_autocomplete";i:0;s:16:"jquery_ui_button";i:0;s:23:"jquery_ui_checkboxradio";i:0;s:22:"jquery_ui_controlgroup";i:0;s:20:"jquery_ui_datepicker";i:0;s:19:"jquery_ui_draggable";i:0;s:19:"jquery_ui_droppable";i:0;s:14:"jquery_ui_menu";i:0;s:17:"jquery_ui_spinner";i:0;s:3:"key";i:0;s:8:"language";i:0;s:14:"layout_builder";i:0;s:38:"layout_builder_expose_all_field_blocks";i:0;s:16:"layout_discovery";i:0;s:14:"layout_library";i:0;s:4:"link";i:0;s:15:"link_attributes";i:0;s:33:"link_attributes_menu_link_content";i:0;s:8:"ln_adimo";i:0;s:10:"ln_article";i:0;s:20:"ln_c_background_only";i:0;s:22:"ln_c_buy_now_component";i:0;s:9:"ln_c_card";i:0;s:13:"ln_c_cardgrid";i:0;s:11:"ln_c_spacer";i:0;s:11:"ln_fusepump";i:0;s:11:"ln_hreflang";i:0;s:9:"ln_m_core";i:0;s:13:"ln_m_document";i:0;s:19:"ln_m_external_video";i:0;s:9:"ln_n_core";i:0;s:15:"ln_price_spider";i:0;s:10:"ln_product";i:0;s:11:"ln_sso_saml";i:0;s:17:"ln_tint_connector";i:0;s:6:"locale";i:0;s:14:"login_security";i:0;s:5:"media";i:0;s:13:"media_library";i:0;s:8:"memcache";i:0;s:17:"menu_link_content";i:0;s:7:"menu_ui";i:0;s:7:"metatag";i:0;s:16:"metatag_hreflang";i:0;s:18:"metatag_open_graph";i:0;s:27:"metatag_open_graph_products";i:0;s:21:"metatag_twitter_cards";i:0;s:7:"migrate";i:0;s:30:"migrate_example_advanced_setup";i:0;s:21:"migrate_example_setup";i:0;s:12:"migrate_plus";i:0;s:18:"migrate_source_csv";i:0;s:13:"migrate_tools";i:0;s:10:"milo_covid";i:0;s:16:"milo_gtm_tagging";i:0;s:14:"milo_teen_quiz";i:0;s:18:"milo_vietnam_pages";i:0;s:5:"mysql";i:0;s:4:"node";i:0;s:10:"noreferrer";i:0;s:16:"ogilvy_c_article";i:0;s:18:"ogilvy_c_milestone";i:0;s:26:"ogilvy_c_sharebuttons_zalo";i:0;s:13:"ogilvy_c_text";i:0;s:9:"ogilvy_co";i:0;s:30:"ogilvy_co_article_listing_3in1";i:0;s:26:"ogilvy_co_bar_notification";i:0;s:29:"ogilvy_co_carousel_fulllength";i:0;s:28:"ogilvy_co_carousel_imageetch";i:0;s:27:"ogilvy_co_ciam_gigya_screen";i:0;s:25:"ogilvy_co_content_related";i:0;s:20:"ogilvy_co_error_page";i:0;s:23:"ogilvy_co_faq_accordion";i:0;s:24:"ogilvy_co_faq_search_bar";i:0;s:38:"ogilvy_co_infographic_nutritionalvalue";i:0;s:26:"ogilvy_co_intro_fulllength";i:0;s:24:"ogilvy_co_masthead_short";i:0;s:30:"ogilvy_co_nutritionalindicator";i:0;s:34:"ogilvy_co_nutritionalindicator_tab";i:0;s:25:"ogilvy_co_partnerslisting";i:0;s:32:"ogilvy_co_recipedescription_list";i:0;s:34:"ogilvy_co_recipedetails_headerdesc";i:0;s:38:"ogilvy_co_recipedetails_productmention";i:0;s:34:"ogilvy_co_recipedetails_stepbystep";i:0;s:32:"ogilvy_co_reviews_ratings_teaser";i:0;s:29:"ogilvy_co_section_teaser_card";i:0;s:22:"ogilvy_co_sportscentre";i:0;s:32:"ogilvy_co_sportslanding_masthead";i:0;s:14:"ogilvy_co_tint";i:0;s:35:"ogilvy_co_videolisting_1hero_3small";i:0;s:23:"ogilvy_co_view_selector";i:0;s:20:"ogilvy_co_winnerlist";i:0;s:13:"ogilvy_common";i:0;s:12:"ogilvy_gigya";i:0;s:20:"ogilvy_module_extend";i:0;s:29:"ogilvy_recipe_structured_data";i:0;s:13:"ogilvy_search";i:0;s:19:"ogilvy_sport_center";i:0;s:26:"ogilvy_template_suggestion";i:0;s:7:"options";i:0;s:13:"options_table";i:0;s:6:"panels";i:0;s:10:"panels_ipe";i:0;s:18:"paragraphs_browser";i:0;s:19:"paragraphs_features";i:0;s:20:"paragraphs_previewer";i:0;s:31:"password_policy_character_types";i:0;s:26:"password_policy_characters";i:0;s:23:"password_policy_history";i:0;s:22:"password_policy_length";i:0;s:24:"password_policy_username";i:0;s:4:"path";i:0;s:10:"path_alias";i:0;s:6:"phpass";i:0;s:15:"project_browser";i:0;s:8:"real_aes";i:0;s:9:"recaptcha";i:0;s:12:"recaptcha_v3";i:0;s:8:"redirect";i:0;s:16:"responsive_image";i:0;s:4:"rest";i:0;s:20:"restrict_route_by_ip";i:0;s:6:"restui";i:0;s:9:"robotstxt";i:0;s:8:"samlauth";i:0;s:19:"samlauth_user_roles";i:0;s:9:"scheduler";i:0;s:14:"schema_article";i:0;s:14:"schema_metatag";i:0;s:19:"schema_organization";i:0;s:14:"schema_product";i:0;s:13:"schema_recipe";i:0;s:15:"schema_web_site";i:0;s:10:"search_api";i:0;s:13:"search_api_db";i:0;s:6:"seckit";i:0;s:13:"serialization";i:0;s:13:"session_limit";i:0;s:6:"shield";i:0;s:8:"shortcut";i:0;s:5:"slick";i:0;s:21:"slick_entityreference";i:0;s:16:"slick_paragraphs";i:0;s:8:"slick_ui";i:0;s:12:"social_media";i:0;s:15:"svg_image_field";i:0;s:6:"syslog";i:0;s:6:"system";i:0;s:8:"taxonomy";i:0;s:4:"text";i:0;s:5:"token";i:0;s:7:"toolbar";i:0;s:10:"twig_tweak";i:0;s:4:"user";i:0;s:17:"video_embed_field";i:0;s:21:"views_infinite_scroll";i:0;s:8:"views_ui";i:0;s:14:"viewsreference";i:0;s:25:"vn_campaign_canister_2021";i:0;s:9:"votingapi";i:0;s:7:"webform";i:0;s:13:"webform_gigya";i:0;s:12:"webform_rest";i:0;s:23:"webform_scheduled_email";i:0;s:10:"webform_ui";i:0;s:13:"webform_views";i:0;s:17:"xls_serialization";i:0;s:2:"ds";i:1;s:10:"dsu_c_core";i:1;s:8:"pathauto";i:1;s:10:"xmlsitemap";i:1;s:15:"password_policy";i:10;s:5:"views";i:10;s:10:"paragraphs";i:11;s:15:"paragraphs_sets";i:12;s:13:"paragraphs_ee";i:15;s:12:"dsu_security";i:50;s:9:"lightnest";i:1000;s:3:"shs";i:1000;}s:5:"theme";a:5:{s:16:"bootstrap_barrio";i:0;s:5:"seven";i:0;s:6:"stable";i:0;s:4:"milo";i:0;s:5:"claro";i:0;}s:7:"profile";s:9:"lightnest";}'

# ── CLI ──────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    raw = sys.argv[1] if len(sys.argv) > 1 else PHP_STRING
    try:
        result = php_unserialize(raw)

        # Remove milo_teen_quiz from module dict
        if isinstance(result.get('module'), dict) and 'milo_teen_quiz' in result['module']:
            del result['module']['milo_teen_quiz']
            print("[removed] milo_teen_quiz from module", file=sys.stderr)

        serialized = php_serialize(result)
        print(serialized)
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)
